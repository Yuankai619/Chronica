/**
 * Timezone-aware date helpers. The server runs in UTC; these helpers
 * compute "today" in the user's configured timezone so that task
 * filtering, day grouping, etc. match what the user sees.
 */

/** Returns YYYY-MM-DD in the given IANA timezone. */
export function dayKeyInTz(
  date: Date,
  timezone: string = "Asia/Taipei",
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "00";
  const d = parts.find((p) => p.type === "day")?.value ?? "00";
  return `${y}-${m}-${d}`;
}

/** Returns a Date representing "now + offsetDays" at 00:00 in the given timezone. */
export function shiftedDayKey(
  offsetDays: number,
  timezone: string = "Asia/Taipei",
): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return dayKeyInTz(d, timezone);
}
