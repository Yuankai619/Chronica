import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { dayKey } from "@/lib/unrecorded";
import { googleExpiresAt, refreshGoogleTokens } from "@/server/google-oauth";

type Client = SupabaseClient<Database>;

const EXPIRY_MARGIN_MS = 2 * 60 * 1000;

export async function isGoogleLinked(
  supabase: Client,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("google_accounts")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return data !== null;
}

async function getGoogleAccessToken(
  supabase: Client,
  userId: string,
): Promise<string | null> {
  const { data: account } = await supabase
    .from("google_accounts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!account) return null;

  if (Date.parse(account.expires_at) - Date.now() > EXPIRY_MARGIN_MS) {
    return account.access_token;
  }

  const refreshed = await refreshGoogleTokens(account.refresh_token).catch(
    () => null,
  );
  if (!refreshed) return null;

  await supabase
    .from("google_accounts")
    .update({
      access_token: refreshed.access_token,
      expires_at: googleExpiresAt(refreshed.expires_in),
    })
    .eq("user_id", userId);

  return refreshed.access_token;
}

interface CalendarEvent {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date;
}

type FetchResult =
  | { events: CalendarEvent[]; error?: never }
  | { events?: never; error: string };

async function fetchWeekEvents(
  token: string,
  weekStart: Date,
  weekEnd: Date,
): Promise<FetchResult> {
  const params = new URLSearchParams({
    timeMin: weekStart.toISOString(),
    timeMax: weekEnd.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "150",
  });
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const body = (await response.json()) as {
          error?: { message?: string; status?: string };
        };
        if (body.error?.message) {
          detail = `${response.status}: ${body.error.message}`;
        }
      } catch {
        // keep the bare status
      }
      if (response.status === 403) {
        detail +=
          " — is the Google Calendar API enabled for this Google Cloud project?";
      }
      return { error: `Google Calendar rejected the request (${detail})` };
    }
    const data = (await response.json()) as {
      items?: {
        id: string;
        summary?: string;
        status?: string;
        start?: { dateTime?: string };
        end?: { dateTime?: string };
      }[];
    };

    const events: CalendarEvent[] = [];
    for (const item of data.items ?? []) {
      if (item.status === "cancelled") continue;
      // All-day events have start.date instead of dateTime — skipped, as
      // they carry no meaningful duration for time planning.
      if (!item.start?.dateTime || !item.end?.dateTime) continue;
      const startAt = new Date(item.start.dateTime);
      const endAt = new Date(item.end.dateTime);
      if (endAt.getTime() <= startAt.getTime()) continue;
      events.push({
        id: item.id,
        title: item.summary ?? "(untitled event)",
        startAt,
        endAt,
      });
    }
    return { events };
  } catch {
    return { error: "Could not reach Google Calendar — network error." };
  }
}

export interface SyncResult {
  added?: number;
  updated?: number;
  removed?: number;
  error?: string;
}

/**
 * Syncs the linked Google Calendar into the planning board for one week.
 * Unchanged events are left alone (preserving manual order); changed
 * events keep their manually assigned category but take the calendar's
 * latest day/time/duration; events deleted from the calendar are removed.
 */
export async function syncCalendarWeek(
  supabase: Client,
  userId: string,
  weekStart: Date,
  weekEnd: Date,
): Promise<SyncResult> {
  const token = await getGoogleAccessToken(supabase, userId);
  if (!token) {
    return {
      error:
        "Google Calendar is not linked or the token could not be refreshed — re-link it in Settings.",
    };
  }

  const fetched = await fetchWeekEvents(token, weekStart, weekEnd);
  if (fetched.error !== undefined) return { error: fetched.error };
  const events = fetched.events;

  const firstDay = dayKey(weekStart);
  const lastDay = dayKey(new Date(weekEnd.getTime() - 1));
  const { data: existing, error: readError } = await supabase
    .from("planned_items")
    .select("*")
    .eq("user_id", userId)
    .not("gcal_event_id", "is", null)
    .gte("day", firstDay)
    .lte("day", lastDay);
  if (readError) return { error: readError.message };

  const existingByEvent = new Map(
    (existing ?? []).map((item) => [item.gcal_event_id!, item]),
  );
  const seenIds = new Set<string>();
  let added = 0;
  let updated = 0;

  const maxPositions = new Map<string, number>();
  async function nextPosition(day: string): Promise<number> {
    if (!maxPositions.has(day)) {
      const { data: last } = await supabase
        .from("planned_items")
        .select("position")
        .eq("user_id", userId)
        .eq("day", day)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();
      maxPositions.set(day, last?.position ?? -1);
    }
    const next = maxPositions.get(day)! + 1;
    maxPositions.set(day, next);
    return next;
  }

  // Events arrive ordered by start time, so same-day inserts naturally
  // land earliest-first.
  for (const event of events) {
    seenIds.add(event.id);
    const day = dayKey(event.startAt);
    const expectedMinutes = Math.max(
      1,
      Math.round((event.endAt.getTime() - event.startAt.getTime()) / 60_000),
    );
    const current = existingByEvent.get(event.id);

    if (!current) {
      const { error } = await supabase.from("planned_items").insert({
        user_id: userId,
        day,
        category_id: null,
        expected_minutes: expectedMinutes,
        position: await nextPosition(day),
        gcal_event_id: event.id,
        title: event.title,
        start_at: event.startAt.toISOString(),
        end_at: event.endAt.toISOString(),
      });
      if (error) return { error: error.message };
      added += 1;
      continue;
    }

    const unchanged =
      current.day === day &&
      current.start_at === event.startAt.toISOString() &&
      current.end_at === event.endAt.toISOString() &&
      current.title === event.title;
    if (unchanged) continue;

    // Keep category (and position when staying on the same day); the
    // calendar wins on day, time, and duration.
    const { error } = await supabase
      .from("planned_items")
      .update({
        day,
        expected_minutes: expectedMinutes,
        title: event.title,
        start_at: event.startAt.toISOString(),
        end_at: event.endAt.toISOString(),
        position:
          current.day === day ? current.position : await nextPosition(day),
      })
      .eq("id", current.id);
    if (error) return { error: error.message };
    updated += 1;
  }

  const removedIds = (existing ?? [])
    .filter((item) => !seenIds.has(item.gcal_event_id!))
    .map((item) => item.id);
  if (removedIds.length > 0) {
    const { error } = await supabase
      .from("planned_items")
      .delete()
      .in("id", removedIds);
    if (error) return { error: error.message };
  }

  return { added, updated, removed: removedIds.length };
}
