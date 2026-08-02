import type { Tables } from "@/lib/database.types";
import { dayKeyInTz } from "@/lib/tz";

export type TimeEntry = Tables<"time_entries">;

/** "1:30" or "90" → minutes; null when invalid. */
export function parseDurationInput(raw: string): number | null {
  const value = raw.trim();
  if (value === "") return null;

  const colonMatch = /^(\d{1,2}):([0-5]\d)$/.exec(value);
  if (colonMatch) {
    const minutes = Number(colonMatch[1]) * 60 + Number(colonMatch[2]);
    return minutes > 0 ? minutes : null;
  }

  if (/^\d+$/.test(value)) {
    const minutes = Number(value);
    return minutes > 0 && minutes <= 24 * 60 ? minutes : null;
  }

  return null;
}

/** 95 → "1h 35m", 45 → "45m". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export interface EntryInput {
  category_id: string;
  started_at: string;
  duration_minutes: number;
  note: string | null;
}

/** Validates quick-add / edit form values. */
export function parseEntryInput(values: {
  category_id: unknown;
  started_at: unknown;
  duration: unknown;
  note: unknown;
}): { ok: true; input: EntryInput } | { ok: false; error: string } {
  if (
    typeof values.category_id !== "string" ||
    values.category_id.length === 0
  ) {
    return { ok: false, error: "A category is required." };
  }

  const duration =
    typeof values.duration === "string"
      ? parseDurationInput(values.duration)
      : null;
  if (duration === null) {
    return {
      ok: false,
      error: "Duration must be minutes (e.g. 90) or h:mm (e.g. 1:30).",
    };
  }

  const startedAtRaw =
    typeof values.started_at === "string" ? values.started_at : "";
  const startedAt = new Date(startedAtRaw);
  if (startedAtRaw === "" || Number.isNaN(startedAt.getTime())) {
    return { ok: false, error: "A valid start time is required." };
  }

  const note = typeof values.note === "string" ? values.note.trim() : "";

  return {
    ok: true,
    input: {
      category_id: values.category_id,
      started_at: startedAt.toISOString(),
      duration_minutes: duration,
      note: note.length > 0 ? note : null,
    },
  };
}

/** started_at + duration_minutes; the end is never stored. */
export function entryEndAt(entry: TimeEntry): Date {
  return new Date(
    Date.parse(entry.started_at) + entry.duration_minutes * 60_000,
  );
}

/**
 * Whole days the end lands past the start day, in the user's zone.
 * Compares day keys rather than milliseconds so DST shifts cannot
 * fabricate or swallow a day.
 */
export function entryDayOffset(entry: TimeEntry, timeZone: string): number {
  const start = dayKeyInTz(new Date(entry.started_at), timeZone);
  const end = dayKeyInTz(entryEndAt(entry), timeZone);
  if (start === end) return 0;
  return Math.round(
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
      86_400_000,
  );
}

/** Days a soft-deleted entry stays restorable before it is purged. */
export const DELETED_RETENTION_DAYS = 14;

/** Rows whose `deleted_at` is strictly before this may be purged. */
export function deletedRetentionCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - DELETED_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

/** Whole days a soft-deleted row still has before it is purged; 0 once past. */
export function deletedDaysLeft(
  deletedAt: string,
  now: Date = new Date(),
): number {
  const remainingMs =
    Date.parse(deletedAt) +
    DELETED_RETENTION_DAYS * 24 * 60 * 60 * 1000 -
    now.getTime();
  return Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
}

/** Groups entries by the user's calendar day, newest day first. */
export function groupEntriesByDay(
  entries: TimeEntry[],
  timeZone: string,
): { day: string; entries: TimeEntry[] }[] {
  const groups = new Map<string, TimeEntry[]>();
  const sorted = entries.toSorted(
    (a, b) => Date.parse(b.started_at) - Date.parse(a.started_at),
  );
  for (const entry of sorted) {
    const key = dayKeyInTz(new Date(entry.started_at), timeZone);
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(entry);
    } else {
      groups.set(key, [entry]);
    }
  }
  return [...groups.entries()].map(([day, dayEntries]) => ({
    day,
    entries: dayEntries,
  }));
}
