import type { TimeEntry } from "@/lib/entries";
import { addDaysKey, dayKeyInTz } from "@/lib/tz";

/** Recorded minutes per calendar day of the given timezone, split by category. */
export function recordedByDayAndCategory(
  entries: TimeEntry[],
  timeZone: string,
): Map<string, Map<string, number>> {
  const totals = new Map<string, Map<string, number>>();
  for (const entry of entries) {
    const key = dayKeyInTz(new Date(entry.started_at), timeZone);
    let byCategory = totals.get(key);
    if (!byCategory) {
      byCategory = new Map();
      totals.set(key, byCategory);
    }
    byCategory.set(
      entry.category_id,
      (byCategory.get(entry.category_id) ?? 0) + entry.duration_minutes,
    );
  }
  return totals;
}

/** One category's share of a day's recorded time. */
export interface DaySegment {
  categoryId: string;
  minutes: number;
}

export interface DayGap {
  day: string;
  recordedMinutes: number;
  plannedMinutes: number;
  /** planned − recorded, floored at 0. */
  unrecordedMinutes: number;
  /** Largest first, so a stacked bar can start from its biggest slice. */
  segments: DaySegment[];
}

/** Ties break on id so the stack order never depends on insertion order. */
function sortedSegments(
  byCategory: Map<string, number> | undefined,
): DaySegment[] {
  if (!byCategory) return [];
  return [...byCategory]
    .map(([categoryId, minutes]) => ({ categoryId, minutes }))
    .sort(
      (a, b) =>
        b.minutes - a.minutes || a.categoryId.localeCompare(b.categoryId),
    );
}

/**
 * Recorded vs planned for each of the 7 days of a week (Monday first).
 * The target is whatever the planning board scheduled for that day.
 */
export function weekDayGaps(
  weekKey: string,
  entries: TimeEntry[],
  plannedByDay: Map<string, number>,
  timeZone: string,
): DayGap[] {
  const totals = recordedByDayAndCategory(entries, timeZone);
  const days: DayGap[] = [];
  for (let i = 0; i < 7; i++) {
    const key = addDaysKey(weekKey, i);
    const segments = sortedSegments(totals.get(key));
    const recorded = segments.reduce((sum, s) => sum + s.minutes, 0);
    const planned = plannedByDay.get(key) ?? 0;
    days.push({
      day: key,
      recordedMinutes: recorded,
      plannedMinutes: planned,
      unrecordedMinutes: Math.max(0, planned - recorded),
      segments,
    });
  }
  return days;
}
