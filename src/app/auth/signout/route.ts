import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Signs the current user out and returns to the login page. */
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), {
    status: 302,
  });
}
