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
 *
 * Idempotent: uses a delete-first "claim" pattern so concurrent calls
 * (e.g. CalendarAutoStart + user navigation racing) cannot create
 * duplicate entries for the same session.
 */
export async function saveAndClearSession(
  supabase: Client,
  session: TimerSession,
  now: Date,
): Promise<{ error?: string }> {
  // Delete the session first as an atomic claim — only one concurrent
  // caller will see a deleted row; the rest exit early.
  const { data: deleted, error: deleteError } = await supabase
    .from("timer_sessions")
    .delete()
    .eq("id", session.id)
    .select("id");
  if (deleteError) return { error: deleteError.message };
  if (!deleted || deleted.length === 0) return {}; // already claimed

  const settled = settleSession(session, now);
  const isCalendar = session.planned_item_id !== null;

  const { error: insertError } = await supabase.from("time_entries").insert({
    user_id: session.user_id,
    category_id: session.category_id,
    started_at: session.started_at,
    duration_minutes: settled.durationMinutes,
    source: "timer",
    // Snapshotted at session start, so a renamed or removed event cannot
    // rewrite what the entry says.
    note: session.planned_item_title,
    // A calendar session ending at its window bound is expected, not an
    // anomaly needing review.
    needs_confirmation: isCalendar ? false : settled.needsConfirmation,
    todo_task_id: session.todo_task_id,
    todo_task_title: session.todo_task_title,
    todo_list_id: session.todo_list_id,
  });
  if (insertError) return { error: insertError.message };

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
 * How far back a missed calendar window is still recorded. Bounds the
 * damage of a first sync (or a long absence) pulling in old events.
 */
export const BACKFILL_LOOKBACK_DAYS = 7;

/**
 * Records calendar windows that already ended but never ran as a session —
 * the browser was closed for the whole window, so no session was ever
 * started. Without this, an event is only timed when the app happened to
 * be open during it.
 *
 * Claims each item by flipping `auto_timer_done` first (a conditional
 * update is atomic), so concurrent renders cannot double-insert.
 */
export async function backfillCalendarEntries(
  supabase: Client,
  userId: string,
  now: Date,
  skipPlannedItemId?: string | null,
): Promise<void> {
  const lookbackIso = new Date(
    now.getTime() - BACKFILL_LOOKBACK_DAYS * 24 * 60 * 60_000,
  ).toISOString();

  const { data: missed } = await supabase
    .from("planned_items")
    .select("*")
    .eq("user_id", userId)
    .eq("auto_timer_done", false)
    .not("gcal_event_id", "is", null)
    .not("category_id", "is", null)
    .lte("end_at", now.toISOString())
    .gte("end_at", lookbackIso)
    .order("start_at", { ascending: true });

  for (const item of missed ?? []) {
    if (!item.category_id || !item.start_at || !item.end_at) continue;
    // The running session owns this item; its own stop path records it.
    if (item.id === skipPlannedItemId) continue;

    const { data: claimed } = await supabase
      .from("planned_items")
      .update({ auto_timer_done: true })
      .eq("id", item.id)
      .eq("auto_timer_done", false)
      .select("id");
    if (!claimed || claimed.length === 0) continue; // already claimed

    const { error: insertError } = await supabase.from("time_entries").insert({
      user_id: userId,
      category_id: item.category_id,
      started_at: item.start_at,
      duration_minutes: windowMinutes(item.start_at, item.end_at),
      source: "timer",
      note: item.title,
      needs_confirmation: false,
    });
    if (insertError) {
      // Release the claim so the next render can retry.
      await supabase
        .from("planned_items")
        .update({ auto_timer_done: false })
        .eq("id", item.id);
    }
  }
}

/** Whole minutes covered by a calendar window (at least 1). */
function windowMinutes(startAt: string, endAt: string): number {
  return Math.max(
    1,
    Math.round((Date.parse(endAt) - Date.parse(startAt)) / 60_000),
  );
}

/**
 * Auto-starts a locked timer session for a calendar item whose window is
 * live (category assigned, not yet run), and records any already-ended
 * windows that were missed while the app was closed. A running manual
 * session is stopped and saved first; an already-running calendar session
 * wins. Returns the current session after reconciliation.
 */
export async function ensureCalendarSession(
  supabase: Client,
  userId: string,
): Promise<TimerSession | null> {
  const session = await getReconciledSession(supabase, userId);

  const now = new Date();
  await backfillCalendarEntries(
    supabase,
    userId,
    now,
    session?.planned_item_id,
  );

  if (session?.planned_item_id) return session;

  const nowIso = now.toISOString();
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

  const durationMinutes = windowMinutes(dueItem.start_at, dueItem.end_at);

  // Cap = event duration, so the standard reconciliation ends the session
  // exactly at the window bound even if the browser is closed.
  const { error } = await supabase.from("timer_sessions").insert({
    user_id: userId,
    category_id: dueItem.category_id,
    started_at: dueItem.start_at,
    expected_minutes: durationMinutes,
    cap_minutes: durationMinutes,
    planned_item_id: dueItem.id,
    planned_item_title: dueItem.title,
  });
  if (error && error.code !== "23505") return session;

  return getReconciledSession(supabase, userId);
}
