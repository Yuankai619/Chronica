import type { Tables } from "@/lib/database.types";
import type { TimeEntry } from "@/lib/entries";
import { computeWeekBalances, type PlanItem } from "@/lib/settlement";
import { getWeekKey, getWeekStart } from "@/lib/week";

export type WeeklyPlan = Tables<"weekly_plans">;

export interface PastWeek {
  plan: WeeklyPlan;
  items: PlanItem[];
  entries: TimeEntry[];
}

export interface CategoryBalance {
  /** Balance of the most recent planned week before the target week. */
  lastBalance: number | null;
  /** Sum of balances across all planned weeks before the target week. */
  cumulativeBalance: number;
  /** Recent per-week balances, newest first: [weekKey, balance]. */
  recent: [string, number][];
}

/**
 * Balance context per category for planning a target week from past
 * planned weeks. Weeks without a plan contribute nothing (no budget →
 * no balance, per spec).
 */
export function computeBalanceContext(
  pastWeeks: PastWeek[],
  recentLimit = 4,
): Map<string, CategoryBalance> {
  const sorted = pastWeeks.toSorted((a, b) =>
    b.plan.week_start.localeCompare(a.plan.week_start),
  );

  const context = new Map<string, CategoryBalance>();
  for (const week of sorted) {
    const balances = computeWeekBalances(week.items, week.entries);
    for (const [categoryId, balance] of balances) {
      let entry = context.get(categoryId);
      if (!entry) {
        entry = { lastBalance: null, cumulativeBalance: 0, recent: [] };
        context.set(categoryId, entry);
      }
      if (entry.lastBalance === null) entry.lastBalance = balance;
      entry.cumulativeBalance += balance;
      if (entry.recent.length < recentLimit) {
        entry.recent.push([week.plan.week_start, balance]);
      }
    }
  }
  return context;
}

export interface PlanItemInput {
  category_id: string;
  budgeted_minutes: number;
  rollover_minutes: number;
}

/**
 * Parses planning form data. For each category the form provides
 * `budget_<id>` (duration string, blank = not budgeted) and optionally
 * `carry_<id>` (checkbox). Carried amounts are the category's last
 * balance, snapshotted at save time.
 */
export function parsePlanInput(
  entries: [string, FormDataEntryValue][],
  balances: Map<string, CategoryBalance>,
  parseDuration: (raw: string) => number | null,
): { ok: true; items: PlanItemInput[] } | { ok: false; error: string } {
  const budgets = new Map<string, number>();
  const carries = new Set<string>();

  for (const [key, value] of entries) {
    if (key.startsWith("budget_")) {
      const categoryId = key.slice("budget_".length);
      const raw = typeof value === "string" ? value.trim() : "";
      if (raw === "" || raw === "0") continue;
      const minutes = parseDuration(raw);
      if (minutes === null) {
        return { ok: false, error: `Invalid budget for a category: "${raw}"` };
      }
      budgets.set(categoryId, minutes);
    } else if (key.startsWith("carry_")) {
      carries.add(key.slice("carry_".length));
    }
  }

  const items: PlanItemInput[] = [];
  const categoryIds = new Set([...budgets.keys(), ...carries]);
  for (const categoryId of categoryIds) {
    const rollover = carries.has(categoryId)
      ? (balances.get(categoryId)?.lastBalance ?? 0)
      : 0;
    items.push({
      category_id: categoryId,
      budgeted_minutes: budgets.get(categoryId) ?? 0,
      rollover_minutes: rollover,
    });
  }

  if (items.length === 0) {
    return { ok: false, error: "Set at least one category budget." };
  }
  return { ok: true, items };
}

/** Monday key of the week after the given date's week. */
export function nextWeekKey(from: Date): string {
  const monday = getWeekStart(from);
  monday.setDate(monday.getDate() + 7);
  return getWeekKey(monday);
}
