import { describe, expect, it } from "vitest";
import type { Category } from "@/lib/categories";
import type { TimeEntry } from "@/lib/entries";
import type { PlannedItem } from "@/lib/plan-board";
import type { WeekHistory } from "@/lib/accuracy";
import { buildWeekReport } from "./agent-report";

function category(id: string): Category {
  return {
    id,
    user_id: "u",
    name: id,
    color: null,
    description: null,
    archived_at: null,
    excluded_from_totals: false,
    created_at: "",
    updated_at: "",
  };
}

function item(
  id: string,
  day: string,
  categoryId: string,
  minutes: number,
): PlannedItem {
  return {
    id,
    user_id: "u",
    day,
    category_id: categoryId,
    expected_minutes: minutes,
    position: 0,
    gcal_event_id: null,
    title: null,
    start_at: null,
    end_at: null,
    auto_timer_done: false,
    is_all_day: false,
    created_at: "",
  };
}

function entry(
  categoryId: string,
  minutes: number,
  startedAt: string,
): TimeEntry {
  return {
    id: `${categoryId}-${minutes}-${startedAt}`,
    user_id: "u",
    category_id: categoryId,
    started_at: startedAt,
    duration_minutes: minutes,
    note: null,
    source: "manual",
    needs_confirmation: false,
    todo_task_id: null,
    todo_task_title: null,
    todo_list_id: null,
    deleted_at: null,
    created_at: "",
    updated_at: "",
  };
}

const work = category("work");
const rest = category("rest");

describe("buildWeekReport", () => {
  const weekKey = "2026-08-10"; // Monday

  it("combines settlement, day gaps, and accuracy for one week", () => {
    const entries: TimeEntry[] = [
      entry("work", 120, "2026-08-10T09:00:00+08:00"),
      entry("rest", 300, "2026-08-11T20:00:00+08:00"),
    ];
    const plannedItems: PlannedItem[] = [
      item("p1", "2026-08-10", "work", 180),
      item("p2", "2026-08-11", "rest", 120),
    ];
    const history: WeekHistory[] = [
      {
        weekKey: "2026-08-03",
        planned: new Map([["work", 180]]),
        actual: new Map([["work", 200]]),
      },
    ];

    const report = buildWeekReport({
      weekKey,
      timeZone: "Asia/Taipei",
      categories: [work, rest],
      entries,
      plannedItems,
      history,
    });

    expect(report.weekKey).toBe(weekKey);

    expect(report.settlement.hasPlan).toBe(true);
    const workRow = report.settlement.rows.find(
      (r) => r.category.id === "work",
    );
    expect(workRow?.actualMinutes).toBe(120);
    expect(workRow?.plannedMinutes).toBe(180);
    expect(workRow?.diffMinutes).toBe(-60);

    const day1 = report.dayGaps.find((d) => d.day === "2026-08-11");
    expect(day1?.recordedMinutes).toBe(300);
    expect(day1?.plannedMinutes).toBe(120);
    // rest ran over its plan, so nothing is "unrecorded" for that day.
    expect(day1?.unrecordedMinutes).toBe(0);

    const workAccuracy = report.accuracy.find((a) => a.categoryId === "work");
    expect(workAccuracy?.averageRatio).toBeCloseTo(200 / 180);
    expect(workAccuracy?.sampleWeeks).toBe(1);
  });

  it("has no accuracy rows when there is no history", () => {
    const report = buildWeekReport({
      weekKey,
      timeZone: "Asia/Taipei",
      categories: [work],
      entries: [],
      plannedItems: [],
      history: [],
    });

    expect(report.accuracy).toEqual([]);
    expect(report.settlement.hasPlan).toBe(false);
    expect(report.dayGaps).toHaveLength(7);
  });
});
