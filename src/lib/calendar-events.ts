import { addDaysKey, dayKeyInTz, zonedDayStart } from "@/lib/tz";

export interface CalendarEventInput {
  id: string;
  title: string | null;
  isAllDay: boolean;
  /** Timed events only; all-day events carry no instant, only date keys. */
  startAt: Date | null;
  endAt: Date | null;
  /** All-day events only. Google's `date` fields — literal calendar dates,
   * never converted through a timezone. `endDateKeyExclusive` is exclusive
   * (a single-day all-day event has end = start + 1 day). */
  startDateKey: string | null;
  endDateKeyExclusive: string | null;
}

export interface EventDaySegment {
  day: string;
  startAt: string | null;
  endAt: string | null;
  expectedMinutes: number;
  isAllDay: boolean;
}

/**
 * Splits a calendar event into one segment per calendar day it spans (in
 * `timeZone`), clipped to `[weekFirstDay, weekLastDay]`. A timed event that
 * crosses midnight gets one segment per day, each clipped to that day's
 * local boundaries so its `expectedMinutes` only counts the part on that
 * day. All-day events carry no duration (`expectedMinutes: 0`) since
 * they're day markers, not tracked work.
 */
export function eventDaySegments(
  event: CalendarEventInput,
  timeZone: string,
  weekFirstDay: string,
  weekLastDay: string,
): EventDaySegment[] {
  const segments: EventDaySegment[] = [];

  if (event.isAllDay) {
    for (
      let day = event.startDateKey!;
      day < event.endDateKeyExclusive!;
      day = addDaysKey(day, 1)
    ) {
      segments.push({
        day,
        startAt: null,
        endAt: null,
        expectedMinutes: 0,
        isAllDay: true,
      });
    }
  } else {
    const startAt = event.startAt!;
    const endAt = event.endAt!;
    const lastDay = dayKeyInTz(new Date(endAt.getTime() - 1), timeZone);
    for (let day = dayKeyInTz(startAt, timeZone); ; day = addDaysKey(day, 1)) {
      const dayStart = zonedDayStart(day, timeZone);
      const dayEnd = zonedDayStart(addDaysKey(day, 1), timeZone);
      const segStart = new Date(
        Math.max(dayStart.getTime(), startAt.getTime()),
      );
      const segEnd = new Date(Math.min(dayEnd.getTime(), endAt.getTime()));
      segments.push({
        day,
        startAt: segStart.toISOString(),
        endAt: segEnd.toISOString(),
        expectedMinutes: Math.max(
          1,
          Math.round((segEnd.getTime() - segStart.getTime()) / 60_000),
        ),
        isAllDay: false,
      });
      if (day === lastDay) break;
    }
  }

  return segments.filter((s) => s.day >= weekFirstDay && s.day <= weekLastDay);
}
