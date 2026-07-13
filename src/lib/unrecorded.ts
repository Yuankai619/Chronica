import type { TimeEntry } from "@/lib/entries";
import { addDaysKey, dayKeyInTz } from "@/lib/tz";

/** Recorded minutes per calendar day of the given timezone. */
export function recordedByDay(
  entries: TimeEntry[],
  timeZone: string,
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    const key = dayKeyInTz(new Date(entry.started_at), timeZone);
    totals.set(key, (totals.get(key) ?? 0) + entry.duration_minutes);
  }
  return totals;
}

export interface DayGap {
  day: string;
  recordedMinutes: number;
  plannedMinutes: number;
  /** planned − recorded, floored at 0. */
  unrecordedMinutes: number;
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
  const totals = recordedByDay(entries, timeZone);
  const days: DayGap[] = [];
  for (let i = 0; i < 7; i++) {
    const key = addDaysKey(weekKey, i);
    const recorded = totals.get(key) ?? 0;
    const planned = plannedByDay.get(key) ?? 0;
    days.push({
      day: key,
      recordedMinutes: recorded,
      plannedMinutes: planned,
      unrecordedMinutes: Math.max(0, planned - recorded),
    });
  }
  return days;
}
