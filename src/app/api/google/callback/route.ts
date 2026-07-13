import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { exchangeGoogleCode, googleExpiresAt } from "@/server/google-oauth";

/** Completes Google Calendar linking: verifies state, stores tokens. */
export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("gcal_oauth_state")?.value;
  const state = searchParams.get("state");
  const code = searchParams.get("code");

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${origin}/settings?gcal=error`);
  }

  const tokens = await exchangeGoogleCode(
    code,
    `${origin}/api/google/callback`,
  );
  if (!tokens || !tokens.refresh_token) {
    return NextResponse.redirect(`${origin}/settings?gcal=error`);
  }

  // Best-effort account email for the settings card.
  let email: string | null = null;
  try {
    const me = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (me.ok) {
      email = ((await me.json()) as { email?: string }).email ?? null;
    }
  } catch {
    // Linking still succeeds without the email.
  }

  const { error } = await supabase.from("google_accounts").upsert({
    user_id: user.id,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: googleExpiresAt(tokens.expires_in),
    account_email: email,
  });

  const response = NextResponse.redirect(
    `${origin}/settings?gcal=${error ? "error" : "linked"}`,
  );
  response.cookies.delete("gcal_oauth_state");
  return response;
}
