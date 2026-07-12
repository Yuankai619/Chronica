import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeUrl, microsoftConfigured } from "@/server/microsoft-oauth";

/** Starts the Microsoft account linking flow (To Do read-only access). */
export async function GET(request: Request) {
  const { origin } = new URL(request.url);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  if (!microsoftConfigured()) {
    return NextResponse.redirect(`${origin}/settings?ms=unconfigured`);
  }

  const state = crypto.randomUUID();
  const response = NextResponse.redirect(
    authorizeUrl(`${origin}/api/microsoft/callback`, state),
  );
  response.cookies.set("ms_oauth_state", state, {
    httpOnly: true,
    maxAge: 600,
    path: "/api/microsoft",
  });
  return response;
}
