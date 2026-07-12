import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { exchangeCode, expiresAtFrom } from "@/server/microsoft-oauth";

/** Completes Microsoft linking: verifies state, stores tokens. */
export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("ms_oauth_state")?.value;
  const state = searchParams.get("state");
  const code = searchParams.get("code");

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${origin}/settings?ms=error`);
  }

  const tokens = await exchangeCode(code, `${origin}/api/microsoft/callback`);
  if (!tokens) {
    return NextResponse.redirect(`${origin}/settings?ms=error`);
  }

  // Best-effort display name for the settings page.
  let username: string | null = null;
  try {
    const me = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (me.ok) {
      const profile = (await me.json()) as {
        userPrincipalName?: string;
        displayName?: string;
      };
      username = profile.userPrincipalName ?? profile.displayName ?? null;
    }
  } catch {
    // Ignore — linking still succeeds without a display name.
  }

  const { error } = await supabase.from("microsoft_accounts").upsert({
    user_id: user.id,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAtFrom(tokens.expires_in),
    account_username: username,
  });

  const response = NextResponse.redirect(
    `${origin}/settings?ms=${error ? "error" : "linked"}`,
  );
  response.cookies.delete("ms_oauth_state");
  return response;
}
