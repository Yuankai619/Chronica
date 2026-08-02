import { describe, expect, it } from "vitest";
import {
  addDaysKey,
  dayKeyInTz,
  isValidTimeZone,
  parseWeekParam,
  weekDayKeysOf,
  weekStartKeyOf,
  weekdayOfKey,
  zonedDayStart,
} from "./tz";

describe("parseWeekParam", () => {
  it("normalizes a mid-week date to its Monday", () => {
    expect(parseWeekParam("2026-07-16", "2026-08-02")).toBe("2026-07-13");
  });

  it("keeps a Monday as-is", () => {
    expect(parseWeekParam("2026-07-13", "2026-08-02")).toBe("2026-07-13");
  });

  it("falls back to the week of today when absent or malformed", () => {
    expect(parseWeekParam(undefined, "2026-08-02")).toBe("2026-07-27");
    expect(parseWeekParam("last-week", "2026-08-02")).toBe("2026-07-27");
    expect(parseWeekParam("2026-7-16", "2026-08-02")).toBe("2026-07-27");
  });
});

describe("dayKeyInTz", () => {
  it("crosses midnight per timezone, not per server clock", () => {
    // 2026-07-13 17:30 UTC = 2026-07-14 01:30 in Taipei (+8).
    const instant = new Date("2026-07-13T17:30:00Z");
    expect(dayKeyInTz(instant, "Asia/Taipei")).toBe("2026-07-14");
    expect(dayKeyInTz(instant, "UTC")).toBe("2026-07-13");
  });
});

describe("day-key arithmetic", () => {
  it("adds days and finds Mondays", () => {
    expect(addDaysKey("2026-07-14", 1)).toBe("2026-07-15");
    expect(addDaysKey("2026-07-01", -1)).toBe("2026-06-30");
    expect(weekdayOfKey("2026-07-13")).toBe(0); // Monday
    expect(weekdayOfKey("2026-07-19")).toBe(6); // Sunday
    expect(weekStartKeyOf("2026-07-19")).toBe("2026-07-13");
    expect(weekStartKeyOf("2026-07-13")).toBe("2026-07-13");
    expect(weekDayKeysOf("2026-07-13")).toHaveLength(7);
    expect(weekDayKeysOf("2026-07-13")[6]).toBe("2026-07-19");
  });
});

describe("zonedDayStart", () => {
  it("returns the true midnight instant of the timezone", () => {
    expect(zonedDayStart("2026-07-14", "Asia/Taipei").toISOString()).toBe(
      "2026-07-13T16:00:00.000Z",
    );
    expect(zonedDayStart("2026-07-14", "UTC").toISOString()).toBe(
      "2026-07-14T00:00:00.000Z",
    );
  });

  it("handles DST transitions", () => {
    // US DST starts 2026-03-08; New York is -5 before, -4 after.
    expect(zonedDayStart("2026-03-09", "America/New_York").toISOString()).toBe(
      "2026-03-09T04:00:00.000Z",
    );
  });
});

describe("isValidTimeZone", () => {
  it("accepts IANA zones and rejects garbage", () => {
    expect(isValidTimeZone("Asia/Taipei")).toBe(true);
    expect(isValidTimeZone("Not/AZone")).toBe(false);
  });
});
