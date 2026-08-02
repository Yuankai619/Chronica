/**
 * User-timezone calendar math. Day keys are YYYY-MM-DD strings; all
 * "which day/week is it" questions are answered in the user's IANA
 * timezone (carried in a cookie), never the server's.
 */

export const TZ_COOKIE = "chronica-tz";

/** The calendar day of an instant, in the given timezone. */
export function dayKeyInTz(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Pure calendar arithmetic on day keys. */
export function addDaysKey(key: string, days: number): string {
  const t = Date.parse(`${key}T00:00:00Z`) + days * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

/** Weekday of a calendar date (0 = Monday … 6 = Sunday); tz-independent. */
export function weekdayOfKey(key: string): number {
  return (new Date(`${key}T00:00:00Z`).getUTCDay() + 6) % 7;
}

/**
 * Monday key of the week containing the given day key.
 *
 * The week starts on Monday. An entry belongs to the week in which it
 * STARTED, even if it crosses midnight into the next week.
 */
export function weekStartKeyOf(key: string): string {
  return addDaysKey(key, -weekdayOfKey(key));
}

/** Normalizes a `?week=` search param to a Monday key; today's week on junk. */
export function parseWeekParam(
  raw: string | undefined,
  todayKey: string,
): string {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return weekStartKeyOf(raw);
  return weekStartKeyOf(todayKey);
}

/** The 7 day keys of the week starting at a Monday key. */
export function weekDayKeysOf(weekKey: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysKey(weekKey, i));
}

function tzOffsetMs(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)!.value);
  // Intl reports hour 24 for midnight in some environments.
  const hour = get("hour") % 24;
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    hour,
    get("minute"),
    get("second"),
  );
  return asUtc - at.getTime();
}

/** The true instant at which a calendar day starts in the timezone. */
export function zonedDayStart(key: string, timeZone: string): Date {
  let t = Date.parse(`${key}T00:00:00Z`);
  // Two passes converge across DST boundaries.
  for (let i = 0; i < 2; i++) {
    t = Date.parse(`${key}T00:00:00Z`) - tzOffsetMs(timeZone, new Date(t));
  }
  return new Date(t);
}

/** True when the string is a usable IANA timezone. */
export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
