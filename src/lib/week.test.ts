import { describe, expect, it } from "vitest";
import {
  dayIndexInWeek,
  getWeekEnd,
  getWeekKey,
  getWeekStart,
  isSameWeek,
} from "./week";

describe("getWeekStart", () => {
  it("returns the same day at midnight for a Monday", () => {
    // 2026-07-13 is a Monday.
    const monday = new Date(2026, 6, 13, 15, 30);
    expect(getWeekStart(monday)).toEqual(new Date(2026, 6, 13, 0, 0, 0, 0));
  });

  it("returns the previous Monday for a Sunday", () => {
    // 2026-07-19 is a Sunday.
    const sunday = new Date(2026, 6, 19, 23, 0);
    expect(getWeekStart(sunday)).toEqual(new Date(2026, 6, 13));
  });

  it("returns the previous Monday for a mid-week day", () => {
    const wednesday = new Date(2026, 6, 15, 9, 0);
    expect(getWeekStart(wednesday)).toEqual(new Date(2026, 6, 13));
  });
});

describe("week attribution across midnight", () => {
  it("attributes an entry starting Sunday 23:00 to the week containing Sunday", () => {
    const start = new Date(2026, 6, 19, 23, 0); // Sunday 23:00
    const stop = new Date(2026, 6, 20, 1, 0); // Monday 01:00 (next week)
    expect(getWeekKey(start)).toBe("2026-07-13");
    expect(isSameWeek(start, stop)).toBe(false);
  });
});

describe("getWeekEnd", () => {
  it("returns the next Monday at midnight (exclusive bound)", () => {
    const wednesday = new Date(2026, 6, 15);
    expect(getWeekEnd(wednesday)).toEqual(new Date(2026, 6, 20));
  });
});

describe("dayIndexInWeek", () => {
  it("is 0 for Monday and 6 for Sunday", () => {
    expect(dayIndexInWeek(new Date(2026, 6, 13, 8, 0))).toBe(0);
    expect(dayIndexInWeek(new Date(2026, 6, 19, 8, 0))).toBe(6);
  });
});
