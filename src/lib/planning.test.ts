import { describe, expect, it } from "vitest";
import {
  computeBalanceContext,
  nextWeekKey,
  parsePlanInput,
  type PastWeek,
} from "./planning";
import { parseDurationInput } from "./entries";
import type { TimeEntry } from "./entries";
import type { PlanItem } from "./settlement";

function entry(categoryId: string, minutes: number): TimeEntry {
  return {
    id: `${categoryId}-${minutes}`,
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

function item(categoryId: string, budgeted: number, rollover = 0): PlanItem {
  return {
    id: `i-${categoryId}-${budgeted}`,
    plan_id: "p",
    category_id: categoryId,
    budgeted_minutes: budgeted,
    rollover_minutes: rollover,
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

describe("computeBalanceContext", () => {
  it("computes last and cumulative balances, newest week first", () => {
    const context = computeBalanceContext([
      week("2026-06-29", [item("reading", 300)], [entry("reading", 360)]), // −60
      week("2026-07-06", [item("reading", 300)], [entry("reading", 420)]), // −120
    ]);
    const reading = context.get("reading")!;
    expect(reading.lastBalance).toBe(-120);
    expect(reading.cumulativeBalance).toBe(-180);
    expect(reading.recent).toEqual([
      ["2026-07-06", -120],
      ["2026-06-29", -60],
    ]);
  });

  it("ignores categories with no budget in a week", () => {
    const context = computeBalanceContext([
      week("2026-07-06", [item("reading", 300)], [entry("games", 500)]),
    ]);
    expect(context.has("games")).toBe(false);
  });
});

describe("parsePlanInput", () => {
  const balances = new Map([
    ["reading", { lastBalance: -120, cumulativeBalance: -180, recent: [] }],
  ]);

  it("builds items with carried rollover snapshots", () => {
    const result = parsePlanInput(
      [
        ["budget_reading", "5:00"],
        ["carry_reading", "on"],
        ["budget_email", "120"],
      ],
      balances,
      parseDurationInput,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      const reading = result.items.find((i) => i.category_id === "reading")!;
      expect(reading.budgeted_minutes).toBe(300);
      expect(reading.rollover_minutes).toBe(-120);
      const email = result.items.find((i) => i.category_id === "email")!;
      expect(email.rollover_minutes).toBe(0);
    }
  });

  it("skips blank budgets and rejects invalid ones", () => {
    expect(
      parsePlanInput([["budget_reading", ""]], balances, parseDurationInput).ok,
    ).toBe(false);
    expect(
      parsePlanInput([["budget_reading", "x"]], balances, parseDurationInput)
        .ok,
    ).toBe(false);
  });

  it("carrying without a known balance yields zero rollover", () => {
    const result = parsePlanInput(
      [
        ["budget_new", "60"],
        ["carry_new", "on"],
      ],
      balances,
      parseDurationInput,
    );
    expect(result.ok && result.items[0].rollover_minutes).toBe(0);
  });
});

describe("nextWeekKey", () => {
  it("returns the following Monday", () => {
    expect(nextWeekKey(new Date(2026, 6, 15))).toBe("2026-07-20");
  });
});
