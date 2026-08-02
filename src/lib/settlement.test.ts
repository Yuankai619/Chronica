import { describe, expect, it } from "vitest";
import type { Category } from "@/lib/categories";
import type { TimeEntry } from "@/lib/entries";
import { computeWeekSettlement } from "./settlement";

function category(id: string, excluded = false): Category {
  return {
    id,
    user_id: "u",
    name: id,
    color: null,
    description: null,
    archived_at: null,
    excluded_from_totals: excluded,
    created_at: "",
    updated_at: "",
  };
}

function entry(categoryId: string, minutes: number): TimeEntry {
  return {
    id: `${categoryId}-${minutes}`,
    user_id: "u",
    category_id: categoryId,
    started_at: "2026-07-13T09:00:00Z",
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
const sleep = category("sleep", true);

describe("computeWeekSettlement", () => {
  it("excludes flagged categories from both totals but keeps their row", () => {
    const settlement = computeWeekSettlement(
      [work, sleep],
      [entry("work", 120), entry("sleep", 480)],
      new Map([
        ["work", 180],
        ["sleep", 420],
      ]),
    );

    const sleepRow = settlement.rows.find((r) => r.category.id === "sleep");
    expect(sleepRow?.actualMinutes).toBe(480);
    expect(sleepRow?.plannedMinutes).toBe(420);
    expect(sleepRow?.diffMinutes).toBe(60);

    expect(settlement.totalActualMinutes).toBe(120);
    expect(settlement.totalPlannedMinutes).toBe(180);
    expect(settlement.excludedMinutes).toBe(480);
    expect(settlement.excludedPlannedMinutes).toBe(420);
  });

  it("reports zero excluded planned minutes when there is no plan", () => {
    const settlement = computeWeekSettlement(
      [work, sleep],
      [entry("work", 120), entry("sleep", 480)],
      new Map(),
    );

    expect(settlement.hasPlan).toBe(false);
    expect(settlement.totalPlannedMinutes).toBeNull();
    expect(settlement.excludedPlannedMinutes).toBe(0);
    expect(settlement.excludedMinutes).toBe(480);
  });

  it("reports zero excluded minutes when nothing is flagged", () => {
    const settlement = computeWeekSettlement(
      [work],
      [entry("work", 120)],
      new Map([["work", 180]]),
    );

    expect(settlement.totalActualMinutes).toBe(120);
    expect(settlement.excludedMinutes).toBe(0);
    expect(settlement.excludedPlannedMinutes).toBe(0);
  });
});
