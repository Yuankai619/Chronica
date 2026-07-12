import { describe, expect, it } from "vitest";
import type { TimeEntry } from "@/lib/entries";
import { recordedByDay, weekDayGaps } from "./unrecorded";

function entry(startedAt: Date, minutes: number): TimeEntry {
  return {
    id: `${startedAt.toISOString()}-${minutes}`,
    user_id: "u",
    category_id: "c",
    started_at: startedAt.toISOString(),
    duration_minutes: minutes,
    note: null,
    source: "manual",
    needs_confirmation: false,
    todo_task_id: null,
    todo_task_title: null,
    created_at: "",
    updated_at: "",
  };
}

describe("recordedByDay", () => {
  it("sums per local start day", () => {
    const totals = recordedByDay([
      entry(new Date(2026, 6, 13, 9), 60),
      entry(new Date(2026, 6, 13, 20), 30),
      entry(new Date(2026, 6, 14, 9), 45),
    ]);
    expect(totals.get("2026-07-13")).toBe(90);
    expect(totals.get("2026-07-14")).toBe(45);
  });
});

describe("weekDayGaps", () => {
  it("computes the acceptance case: 14h target, 9h recorded → 5h unrecorded", () => {
    const gaps = weekDayGaps(
      new Date(2026, 6, 13),
      [entry(new Date(2026, 6, 13, 8), 540)],
      840,
    );
    expect(gaps[0].day).toBe("2026-07-13");
    expect(gaps[0].recordedMinutes).toBe(540);
    expect(gaps[0].unrecordedMinutes).toBe(300);
    expect(gaps).toHaveLength(7);
    expect(gaps[6].day).toBe("2026-07-19");
  });

  it("floors unrecorded at zero when over target", () => {
    const gaps = weekDayGaps(
      new Date(2026, 6, 13),
      [entry(new Date(2026, 6, 13, 8), 900)],
      840,
    );
    expect(gaps[0].unrecordedMinutes).toBe(0);
  });
});
