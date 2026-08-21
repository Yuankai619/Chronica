import { describe, expect, it } from "vitest";
import { eventDaySegments, type CalendarEventInput } from "./calendar-events";

const TZ = "Asia/Taipei"; // UTC+8, no DST — keeps expectations simple.

function timedEvent(startAt: string, endAt: string): CalendarEventInput {
  return {
    id: "e1",
    title: "Event",
    isAllDay: false,
    startAt: new Date(startAt),
    endAt: new Date(endAt),
    startDateKey: null,
    endDateKeyExclusive: null,
  };
}

function allDayEvent(
  startDateKey: string,
  endDateKeyExclusive: string,
): CalendarEventInput {
  return {
    id: "e1",
    title: "Event",
    isAllDay: true,
    startAt: null,
    endAt: null,
    startDateKey,
    endDateKeyExclusive,
  };
}

describe("eventDaySegments", () => {
  it("produces one full-day segment for a single-day all-day event", () => {
    const segments = eventDaySegments(
      allDayEvent("2026-08-22", "2026-08-23"),
      TZ,
      "2026-08-17",
      "2026-08-23",
    );
    expect(segments).toEqual([
      {
        day: "2026-08-22",
        startAt: null,
        endAt: null,
        expectedMinutes: 0,
        isAllDay: true,
      },
    ]);
  });

  it("produces one segment per day for a multi-day all-day event", () => {
    const segments = eventDaySegments(
      allDayEvent("2026-08-22", "2026-08-25"),
      TZ,
      "2026-08-17",
      "2026-08-23",
    );
    expect(segments.map((s) => s.day)).toEqual(["2026-08-22", "2026-08-23"]);
    expect(segments.every((s) => s.expectedMinutes === 0 && s.isAllDay)).toBe(
      true,
    );
  });

  it("clips all-day segments to the sync week window", () => {
    const segments = eventDaySegments(
      allDayEvent("2026-08-20", "2026-08-27"),
      TZ,
      "2026-08-17",
      "2026-08-23",
    );
    expect(segments.map((s) => s.day)).toEqual([
      "2026-08-20",
      "2026-08-21",
      "2026-08-22",
      "2026-08-23",
    ]);
  });

  it("produces a single segment for a same-day timed event", () => {
    const segments = eventDaySegments(
      timedEvent("2026-08-22T02:00:00Z", "2026-08-22T03:30:00Z"),
      TZ,
      "2026-08-17",
      "2026-08-23",
    );
    expect(segments).toEqual([
      {
        day: "2026-08-22",
        startAt: "2026-08-22T02:00:00.000Z",
        endAt: "2026-08-22T03:30:00.000Z",
        expectedMinutes: 90,
        isAllDay: false,
      },
    ]);
  });

  it("splits a timed event that crosses midnight into per-day segments clipped to day boundaries", () => {
    // 23:00 Aug 22 -> 02:00 Aug 23 in Asia/Taipei (UTC+8) = 15:00 -> 18:00 UTC.
    const segments = eventDaySegments(
      timedEvent("2026-08-22T15:00:00Z", "2026-08-22T18:00:00Z"),
      TZ,
      "2026-08-17",
      "2026-08-23",
    );
    expect(segments).toEqual([
      {
        day: "2026-08-22",
        startAt: "2026-08-22T15:00:00.000Z",
        endAt: "2026-08-22T16:00:00.000Z", // midnight Taipei
        expectedMinutes: 60,
        isAllDay: false,
      },
      {
        day: "2026-08-23",
        startAt: "2026-08-22T16:00:00.000Z",
        endAt: "2026-08-22T18:00:00.000Z",
        expectedMinutes: 120,
        isAllDay: false,
      },
    ]);
  });

  it("does not spill into the next day when a timed event ends exactly at midnight", () => {
    // 22:00 -> 24:00 Aug 22 Taipei = 14:00 -> 16:00 UTC.
    const segments = eventDaySegments(
      timedEvent("2026-08-22T14:00:00Z", "2026-08-22T16:00:00Z"),
      TZ,
      "2026-08-17",
      "2026-08-23",
    );
    expect(segments.map((s) => s.day)).toEqual(["2026-08-22"]);
  });
});
