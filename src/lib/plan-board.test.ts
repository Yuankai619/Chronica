import { describe, expect, it } from "vitest";
import type { Category } from "@/lib/categories";
import type { TimeEntry } from "@/lib/entries";
import {
  computeWeekStatus,
  groupItemsByDay,
  plannedByCategory,
  plannedByDay,
  weekDayKeys,
  type PlannedItem,
} from "./plan-board";
import { computeWeekSettlement, formatSignedDuration } from "./settlement";
import { computeAccuracy, isLikelyOverrun } from "./accuracy";
import { weekDayGaps } from "./unrecorded";

function category(id: string): Category {
  return {
    id,
    user_id: "u",
    name: id,
    description: null,
    archived_at: null,
    created_at: "",
    updated_at: "",
  };
}

function item(
  id: string,
  day: string,
  categoryId: string,
  minutes: number,
  position = 0,
): PlannedItem {
  return {
    id,
    user_id: "u",
    day,
    category_id: categoryId,
    expected_minutes: minutes,
    position,
    gcal_event_id: null,
    title: null,
    start_at: null,
    end_at: null,
    auto_timer_done: false,
    created_at: "",
  };
}

function entry(
  categoryId: string,
  minutes: number,
  startedAt: Date,
): TimeEntry {
  return {
    id: `${categoryId}-${minutes}-${startedAt.toISOString()}`,
    user_id: "u",
    category_id: categoryId,
    started_at: startedAt.toISOString(),
    duration_minutes: minutes,
    note: null,
    source: "manual",
    needs_confirmation: false,
    todo_task_id: null,
    todo_task_title: null,
    todo_list_id: null,
    created_at: "",
    updated_at: "",
  };
}

const monday = new Date(2026, 6, 13);
const reading = category("reading");
const games = category("games");

describe("weekDayKeys / groupItemsByDay", () => {
  it("produces Monday-first day keys and position-sorted columns", () => {
    const keys = weekDayKeys(monday);
    expect(keys[0]).toBe("2026-07-13");
    expect(keys[6]).toBe("2026-07-19");

    const grouped = groupItemsByDay(monday, [
      item("b", "2026-07-13", "reading", 30, 1),
      item("a", "2026-07-13", "reading", 60, 0),
      item("c", "2026-07-15", "games", 45),
    ]);
    expect(grouped.get("2026-07-13")!.map((i) => i.id)).toEqual(["a", "b"]);
    expect(grouped.get("2026-07-15")!).toHaveLength(1);
    expect(grouped.get("2026-07-14")!).toEqual([]);
  });
});

describe("planned totals", () => {
  const items = [
    item("a", "2026-07-13", "reading", 60),
    item("b", "2026-07-13", "games", 30),
    item("c", "2026-07-14", "reading", 90),
  ];

  it("sums per category and per day", () => {
    expect(plannedByCategory(items).get("reading")).toBe(150);
    expect(plannedByDay(items).get("2026-07-13")).toBe(90);
  });
});

describe("computeWeekStatus", () => {
  it("reports signed diff per category, info-only", () => {
    const status = computeWeekStatus(
      [reading, games],
      [item("a", "2026-07-13", "reading", 120)],
      [entry("reading", 90, new Date(2026, 6, 13, 9))],
    );
    expect(status).toHaveLength(1);
    expect(status[0].diffMinutes).toBe(-30);
  });
});

describe("computeWeekSettlement (planned vs actual)", () => {
  it("computes over-plan diff", () => {
    const settlement = computeWeekSettlement(
      [reading, games],
      [
        entry("reading", 360, new Date(2026, 6, 13, 9)),
        entry("games", 60, new Date(2026, 6, 14, 9)),
      ],
      new Map([["reading", 300]]),
    );
    const row = settlement.rows.find((r) => r.category.id === "reading")!;
    expect(row.diffMinutes).toBe(60);
    expect(settlement.hasPlan).toBe(true);
  });

  it("shows actuals only when nothing is planned", () => {
    const settlement = computeWeekSettlement(
      [reading],
      [entry("reading", 90, new Date(2026, 6, 13, 9))],
      new Map(),
    );
    expect(settlement.hasPlan).toBe(false);
    expect(settlement.rows[0].diffMinutes).toBeNull();
  });
});

describe("computeAccuracy", () => {
  it("flags a consistent 1.5x overspender", () => {
    const accuracy = computeAccuracy([
      {
        weekKey: "2026-06-29",
        planned: new Map([["reading", 600]]),
        actual: new Map([["reading", 900]]),
      },
      {
        weekKey: "2026-07-06",
        planned: new Map([["reading", 600]]),
        actual: new Map([["reading", 900]]),
      },
    ]);
    const acc = accuracy.get("reading")!;
    expect(acc.averageRatio).toBeCloseTo(1.5);
    expect(isLikelyOverrun(acc)).toBe(true);
  });
});

describe("weekDayGaps (vs planned)", () => {
  it("measures unrecorded time against the day's plan", () => {
    const gaps = weekDayGaps(
      monday,
      [entry("reading", 540, new Date(2026, 6, 13, 8))],
      new Map([["2026-07-13", 840]]),
    );
    expect(gaps[0].unrecordedMinutes).toBe(300);
    expect(gaps[1].plannedMinutes).toBe(0);
  });
});

describe("formatSignedDuration", () => {
  it("formats sign and units", () => {
    expect(formatSignedDuration(150)).toBe("+2h 30m");
    expect(formatSignedDuration(-45)).toBe("−45m");
  });
});
