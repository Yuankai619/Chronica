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
  const isCalendar = session.planned_item_id !== null;

  const { error: insertError } = await supabase.from("time_entries").insert({
    user_id: session.user_id,
    category_id: session.category_id,
    started_at: session.started_at,
    duration_minutes: settled.durationMinutes,
    source: "timer",
    // A calendar session ending at its window bound is expected, not an
    // anomaly needing review.
    needs_confirmation: isCalendar ? false : settled.needsConfirmation,
    todo_task_id: session.todo_task_id,
    todo_task_title: session.todo_task_title,
    todo_list_id: session.todo_list_id,
  });
  if (insertError) return { error: insertError.message };

  const { error: deleteError } = await supabase
    .from("timer_sessions")
    .delete()
    .eq("id", session.id);
  if (deleteError) return { error: deleteError.message };

  if (isCalendar) {
    await supabase
      .from("planned_items")
      .update({ auto_timer_done: true })
      .eq("id", session.planned_item_id!);
  }

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

/**
 * Auto-starts a locked timer session for a calendar item whose window is
 * live (category assigned, not yet run). A running manual session is
 * stopped and saved first; an already-running calendar session wins.
 * Returns the current session after reconciliation.
 */
export async function ensureCalendarSession(
  supabase: Client,
  userId: string,
): Promise<TimerSession | null> {
  const session = await getReconciledSession(supabase, userId);
  if (session?.planned_item_id) return session;

  const nowIso = new Date().toISOString();
  const { data: dueItem } = await supabase
    .from("planned_items")
    .select("*")
    .eq("user_id", userId)
    .eq("auto_timer_done", false)
    .not("gcal_event_id", "is", null)
    .not("category_id", "is", null)
    .lte("start_at", nowIso)
    .gt("end_at", nowIso)
    .order("start_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (
    !dueItem ||
    !dueItem.category_id ||
    !dueItem.start_at ||
    !dueItem.end_at
  ) {
    return session;
  }

  if (session) {
    const saved = await saveAndClearSession(supabase, session, new Date());
    if (saved.error) return session;
  }

  const durationMinutes = Math.max(
    1,
    Math.round(
      (Date.parse(dueItem.end_at) - Date.parse(dueItem.start_at)) / 60_000,
    ),
  );

  // Cap = event duration, so the standard reconciliation ends the session
  // exactly at the window bound even if the browser is closed.
  const { error } = await supabase.from("timer_sessions").insert({
    user_id: userId,
    category_id: dueItem.category_id,
    started_at: dueItem.start_at,
    expected_minutes: durationMinutes,
    cap_minutes: durationMinutes,
    planned_item_id: dueItem.id,
  });
  if (error && error.code !== "23505") return session;

  return getReconciledSession(supabase, userId);
}
