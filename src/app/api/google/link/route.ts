import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { googleAuthorizeUrl, googleConfigured } from "@/server/google-oauth";

/** Starts Google Calendar linking (read-only calendar access). */
export async function GET(request: Request) {
  const { origin } = new URL(request.url);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  if (!googleConfigured()) {
    return NextResponse.redirect(`${origin}/settings?gcal=unconfigured`);
  }

  const state = crypto.randomUUID();
  const response = NextResponse.redirect(
    googleAuthorizeUrl(`${origin}/api/google/callback`, state),
  );
  response.cookies.set("gcal_oauth_state", state, {
    httpOnly: true,
    maxAge: 600,
    path: "/api/google",
  });
  return response;
}
