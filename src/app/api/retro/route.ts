import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runRetro } from "@/server/retro";

export const maxDuration = 120;

/** Triggers the AI retro for a review week (manual only, per spec). */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    week?: string;
  } | null;
  const week = body?.week;
  if (!week || !/^\d{4}-\d{2}-\d{2}$/.test(week)) {
    return NextResponse.json({ error: "Invalid week" }, { status: 400 });
  }

  const result = await runRetro(supabase, user.id, week);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ content: result.content });
}
