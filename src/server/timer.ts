import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/database.types";
import { DEFAULT_CAP_MINUTES, isCapExceeded, settleSession } from "@/lib/timer";

type Client = SupabaseClient<Database>;
export type TimerSession = Tables<"timer_sessions">;

/** The user's configured hard cap, falling back to the default. */
export async function getCapMinutes(
  supabase: Client,
  userId: string,
): Promise<number> {
  const { data } = await supabase
    .from("user_settings")
    .select("timer_cap_minutes")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.timer_cap_minutes ?? DEFAULT_CAP_MINUTES;
}

/**
 * Saves a finished session as a time entry and removes the session row.
 * Used by explicit stops, automatic stops when a new timer starts, and
 * cap reconciliation.
 */
export async function saveAndClearSession(
  supabase: Client,
  session: TimerSession,
  now: Date,
): Promise<{ error?: string }> {
  const settled = settleSession(session, now);

  const { error: insertError } = await supabase.from("time_entries").insert({
    user_id: session.user_id,
    category_id: session.category_id,
    started_at: session.started_at,
    duration_minutes: settled.durationMinutes,
    source: "timer",
    needs_confirmation: settled.needsConfirmation,
    todo_task_id: session.todo_task_id,
    todo_task_title: session.todo_task_title,
  });
  if (insertError) return { error: insertError.message };

  const { error: deleteError } = await supabase
    .from("timer_sessions")
    .delete()
    .eq("id", session.id);
  if (deleteError) return { error: deleteError.message };

  return {};
}

/**
 * Returns the user's running session, first reconciling it: a session that
 * exceeded its hard cap while the browser was away is saved (capped and
 * flagged) and no longer counts as running.
 */
export async function getReconciledSession(
  supabase: Client,
  userId: string,
): Promise<TimerSession | null> {
  const { data: session } = await supabase
    .from("timer_sessions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!session) return null;

  const now = new Date();
  if (isCapExceeded(session, now)) {
    await saveAndClearSession(supabase, session, now);
    return null;
  }
  return session;
}
