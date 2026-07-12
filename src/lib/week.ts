/**
 * Week attribution utilities.
 *
 * The week starts on Monday, and a time entry belongs to the week in which
 * it STARTED, even if it crosses midnight into the next week.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Returns the Monday 00:00:00.000 (local time) of the week containing `date`. */
export function getWeekStart(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  // getDay(): Sunday = 0 ... Saturday = 6; shift so Monday = 0.
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

/** Returns the exclusive end (next Monday 00:00) of the week containing `date`. */
export function getWeekEnd(date: Date): Date {
  const end = getWeekStart(date);
  end.setDate(end.getDate() + 7);
  return end;
}

/**
 * ISO-like week key (e.g. "2026-07-13" = the Monday of that week),
 * used to attribute entries and plans to a week.
 */
export function getWeekKey(date: Date): string {
  const monday = getWeekStart(date);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const d = String(monday.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** True when both dates fall in the same Monday-started week. */
export function isSameWeek(a: Date, b: Date): boolean {
  return getWeekStart(a).getTime() === getWeekStart(b).getTime();
}

/** Number of whole days between `date` and its week start (0 = Monday). */
export function dayIndexInWeek(date: Date): number {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return Math.round(
    (start.getTime() - getWeekStart(date).getTime()) / MS_PER_DAY,
  );
}
