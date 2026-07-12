import { describe, expect, it } from "vitest";
import { computeAccuracy, formatRatio, isLikelyOverrun } from "./accuracy";
import type { PastWeek } from "./planning";
import type { PlanItem } from "./settlement";
import type { TimeEntry } from "./entries";

function entry(categoryId: string, minutes: number): TimeEntry {
  return {
    id: `${categoryId}-${minutes}-${Math.random()}`,
    user_id: "u",
    category_id: categoryId,
    started_at: "2026-07-06T09:00:00Z",
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

function item(categoryId: string, budgeted: number): PlanItem {
  return {
    id: `i-${categoryId}-${Math.random()}`,
    plan_id: "p",
    category_id: categoryId,
    budgeted_minutes: budgeted,
    rollover_minutes: 0,
  };
}

function week(
  weekStart: string,
  items: PlanItem[],
  entries: TimeEntry[],
): PastWeek {
  return {
    plan: {
      id: `plan-${weekStart}`,
      user_id: "u",
      week_start: weekStart,
      created_at: "",
      updated_at: "",
    },
    items,
    entries,
  };
}

describe("computeAccuracy", () => {
  it("averages actual/budget ratios (consistent 1.5x case)", () => {
    const accuracy = computeAccuracy([
      week("2026-06-29", [item("reading", 600)], [entry("reading", 900)]),
      week("2026-07-06", [item("reading", 600)], [entry("reading", 900)]),
    ]);
    const reading = accuracy.get("reading")!;
    expect(reading.averageRatio).toBeCloseTo(1.5);
    expect(reading.sampleWeeks).toBe(2);
  });

  it("skips zero-budget items", () => {
    const accuracy = computeAccuracy([
      week("2026-07-06", [item("reading", 0)], [entry("reading", 100)]),
    ]);
    expect(accuracy.has("reading")).toBe(false);
  });
});

describe("isLikelyOverrun", () => {
  it("flags a consistent 1.5x overspender with enough samples", () => {
    expect(isLikelyOverrun({ averageRatio: 1.5, sampleWeeks: 2 })).toBe(true);
    expect(isLikelyOverrun({ averageRatio: 1.5, sampleWeeks: 1 })).toBe(false);
    expect(isLikelyOverrun({ averageRatio: 1.05, sampleWeeks: 5 })).toBe(false);
    expect(isLikelyOverrun(undefined)).toBe(false);
  });
});

describe("formatRatio", () => {
  it("renders as a percentage", () => {
    expect(formatRatio(1.52)).toBe("152%");
    expect(formatRatio(0.8)).toBe("80%");
  });
});
