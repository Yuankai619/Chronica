import type { TimeEntry } from "@/lib/entries";

export const DEFAULT_DAILY_TARGET_MINUTES = 840; // 14 hours

/** Local-day key for a date. */
export function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Recorded minutes per local day (attributed to the entry's start day). */
export function recordedByDay(entries: TimeEntry[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    const key = dayKey(new Date(entry.started_at));
    totals.set(key, (totals.get(key) ?? 0) + entry.duration_minutes);
  }
  return totals;
}

export interface DayGap {
  day: string;
  recordedMinutes: number;
  /** target − recorded, floored at 0. */
  unrecordedMinutes: number;
}

/** Recorded vs target for each of the 7 days of a week (Monday first). */
export function weekDayGaps(
  weekStart: Date,
  entries: TimeEntry[],
  targetMinutes: number,
): DayGap[] {
  const totals = recordedByDay(entries);
  const days: DayGap[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const key = dayKey(d);
    const recorded = totals.get(key) ?? 0;
    days.push({
      day: key,
      recordedMinutes: recorded,
      unrecordedMinutes: Math.max(0, targetMinutes - recorded),
    });
  }
  return days;
}
