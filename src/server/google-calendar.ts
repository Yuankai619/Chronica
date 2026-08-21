import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  eventDaySegments,
  type CalendarEventInput,
} from "@/lib/calendar-events";
import { dayKeyInTz } from "@/lib/tz";
import { googleExpiresAt, refreshGoogleTokens } from "@/server/google-oauth";

type Client = SupabaseClient<Database>;
type PlannedItemRow = Database["public"]["Tables"]["planned_items"]["Row"];

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

/** Null title for untitled events; every render site has its own fallback. */
type CalendarEvent = CalendarEventInput;

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
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
      }[];
    };

    const events: CalendarEvent[] = [];
    for (const item of data.items ?? []) {
      if (item.status === "cancelled") continue;
      const title = item.summary?.trim() || null;

      // All-day events carry a date-only `date` field instead of
      // `dateTime`. It's a literal calendar date, not an instant, so it's
      // kept as a string and never run through timezone conversion.
      // `end.date` is exclusive (a single-day event still has end = start
      // + 1 day).
      if (item.start?.date && item.end?.date) {
        if (item.end.date <= item.start.date) continue;
        events.push({
          id: item.id,
          title,
          isAllDay: true,
          startAt: null,
          endAt: null,
          startDateKey: item.start.date,
          endDateKeyExclusive: item.end.date,
        });
        continue;
      }

      if (!item.start?.dateTime || !item.end?.dateTime) continue;
      const startAt = new Date(item.start.dateTime);
      const endAt = new Date(item.end.dateTime);
      if (endAt.getTime() <= startAt.getTime()) continue;
      events.push({
        id: item.id,
        title,
        isAllDay: false,
        startAt,
        endAt,
        startDateKey: null,
        endDateKeyExclusive: null,
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
 * All-day and multi-day events materialize one row per calendar day they
 * span within the synced week.
 */
export async function syncCalendarWeek(
  supabase: Client,
  userId: string,
  weekStart: Date,
  weekEnd: Date,
  timeZone: string,
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

  const firstDay = dayKeyInTz(weekStart, timeZone);
  const lastDay = dayKeyInTz(new Date(weekEnd.getTime() - 1), timeZone);
  const fetchedIds = events.map((event) => event.id);

  // Rows already on this week's board (used to detect events removed from
  // the calendar).
  const { data: weekExisting, error: weekReadError } = await supabase
    .from("planned_items")
    .select("*")
    .eq("user_id", userId)
    .not("gcal_event_id", "is", null)
    .gte("day", firstDay)
    .lte("day", lastDay);
  if (weekReadError) return { error: weekReadError.message };

  // Rows for the fetched events regardless of which day they currently sit
  // on — an event rescheduled across a week boundary keeps its Google id,
  // so `planned_items_gcal_event_idx` (user_id, gcal_event_id) can already
  // be taken by a stale row parked under its old week.
  const { data: matchingExisting, error: matchReadError } =
    fetchedIds.length > 0
      ? await supabase
          .from("planned_items")
          .select("*")
          .eq("user_id", userId)
          .in("gcal_event_id", fetchedIds)
      : { data: [] as typeof weekExisting, error: null };
  if (matchReadError) return { error: matchReadError.message };

  // All known rows per event id, deduped by row id and day-ordered, so an
  // event's segments can be paired with its existing rows positionally —
  // a reschedule (or an all-day/multi-day event that now spans a
  // different number of days) updates rows in place by index rather than
  // by day, keeping the first day's manually assigned category on a
  // simple reschedule.
  const rowsByEvent = new Map<string, PlannedItemRow[]>();
  for (const row of [...(weekExisting ?? []), ...(matchingExisting ?? [])]) {
    const list = rowsByEvent.get(row.gcal_event_id!) ?? [];
    if (!list.some((r) => r.id === row.id)) list.push(row);
    rowsByEvent.set(row.gcal_event_id!, list);
  }
  for (const list of rowsByEvent.values()) {
    list.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
  }

  const seenEventIds = new Set<string>();
  const staleRowIds: string[] = [];
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
    seenEventIds.add(event.id);
    const segments = eventDaySegments(event, timeZone, firstDay, lastDay);
    const oldRows = rowsByEvent.get(event.id) ?? [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const current = oldRows[i];

      if (!current) {
        const { error } = await supabase.from("planned_items").insert({
          user_id: userId,
          day: segment.day,
          category_id: null,
          expected_minutes: segment.expectedMinutes,
          position: await nextPosition(segment.day),
          gcal_event_id: event.id,
          title: event.title,
          start_at: segment.startAt,
          end_at: segment.endAt,
          is_all_day: segment.isAllDay,
        });
        if (error) return { error: error.message };
        added += 1;
        continue;
      }

      const unchanged =
        current.day === segment.day &&
        current.start_at === segment.startAt &&
        current.end_at === segment.endAt &&
        current.title === event.title &&
        current.is_all_day === segment.isAllDay;
      if (unchanged) continue;

      // Keep category (and position when staying on the same day); the
      // calendar wins on day, time, and duration.
      const { error } = await supabase
        .from("planned_items")
        .update({
          day: segment.day,
          expected_minutes: segment.expectedMinutes,
          title: event.title,
          start_at: segment.startAt,
          end_at: segment.endAt,
          is_all_day: segment.isAllDay,
          position:
            current.day === segment.day
              ? current.position
              : await nextPosition(segment.day),
        })
        .eq("id", current.id);
      if (error) return { error: error.message };
      updated += 1;
    }

    // The event now spans fewer days than it used to — drop the leftover
    // rows (e.g. a multi-day event shortened, or an event switched from
    // all-day/multi-day to a single timed slot).
    for (let i = segments.length; i < oldRows.length; i++) {
      staleRowIds.push(oldRows[i].id);
    }
  }

  const removedIds = [
    ...(weekExisting ?? [])
      .filter((item) => !seenEventIds.has(item.gcal_event_id!))
      .map((item) => item.id),
    ...staleRowIds,
  ];
  if (removedIds.length > 0) {
    const { error } = await supabase
      .from("planned_items")
      .delete()
      .in("id", removedIds);
    if (error) return { error: error.message };
  }

  return { added, updated, removed: removedIds.length };
}
