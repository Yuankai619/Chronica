import { describe, expect, it } from "vitest";
import type { Category } from "@/lib/categories";
import type { TimeEntry } from "@/lib/entries";
import {
  computeWeekBalances,
  computeWeekSettlement,
  formatSignedDuration,
  type PlanItem,
} from "./settlement";

function category(id: string, group: Category["category_group"]): Category {
  return {
    id,
    user_id: "u",
    name: id,
    category_group: group,
    description: null,
    archived_at: null,
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
    created_at: "",
    updated_at: "",
  };
}

function planItem(
  categoryId: string,
  budgeted: number,
  rollover = 0,
): PlanItem {
  return {
    id: `p-${categoryId}`,
    plan_id: "plan",
    category_id: categoryId,
    budgeted_minutes: budgeted,
    rollover_minutes: rollover,
  };
}

const reading = category("reading", "core");
const email = category("email", "supportive");
const games = category("games", "rest");

describe("computeWeekSettlement", () => {
  it("computes over-budget diff (Reading 5h budget, 6h actual → +1h)", () => {
    const result = computeWeekSettlement(
      [reading],
      [entry("reading", 360)],
      [planItem("reading", 300)],
    );
    expect(result.rows[0].diffMinutes).toBe(60);
    expect(result.rows[0].budgetMinutes).toBe(300);
  });

  it("includes the rollover snapshot in the effective budget", () => {
    const result = computeWeekSettlement(
      [reading],
      [entry("reading", 100)],
      [planItem("reading", 300, -120)],
    );
    expect(result.rows[0].budgetMinutes).toBe(180);
    expect(result.rows[0].diffMinutes).toBe(-80);
  });

  it("shows actuals without over/under when there is no plan", () => {
    const result = computeWeekSettlement(
      [reading],
      [entry("reading", 90)],
      null,
    );
    expect(result.hasPlan).toBe(false);
    expect(result.rows[0].budgetMinutes).toBeNull();
    expect(result.rows[0].diffMinutes).toBeNull();
    expect(result.totalBudgetMinutes).toBeNull();
  });

  it("sums effective work time from core + supportive only", () => {
    const result = computeWeekSettlement(
      [reading, email, games],
      [entry("reading", 120), entry("email", 60), entry("games", 240)],
      null,
    );
    expect(result.effectiveWorkMinutes).toBe(180);
    expect(result.totalActualMinutes).toBe(420);
  });

  it("keeps budgeted categories with zero actuals and drops untouched ones", () => {
    const result = computeWeekSettlement(
      [reading, games],
      [],
      [planItem("reading", 300)],
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].category.id).toBe("reading");
    expect(result.rows[0].actualMinutes).toBe(0);
  });
});

describe("computeWeekBalances", () => {
  it("computes surplus and deficit per category", () => {
    const balances = computeWeekBalances(
      [planItem("reading", 300), planItem("email", 120)],
      [entry("reading", 420), entry("email", 60)],
    );
    expect(balances.get("reading")).toBe(-120); // 2h over
    expect(balances.get("email")).toBe(60); // 1h left
  });
});

describe("formatSignedDuration", () => {
  it("formats sign and units", () => {
    expect(formatSignedDuration(150)).toBe("+2h 30m");
    expect(formatSignedDuration(-45)).toBe("−45m");
    expect(formatSignedDuration(0)).toBe("0m");
    expect(formatSignedDuration(-120)).toBe("−2h");
  });
});
