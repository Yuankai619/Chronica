import type { Tables } from "@/lib/database.types";
import { isEffectiveWork, type Category } from "@/lib/categories";
import type { TimeEntry } from "@/lib/entries";

export type PlanItem = Tables<"weekly_plan_items">;

export interface SettlementRow {
  category: Category;
  /** Budget for the week including the rollover snapshot; null = no budget set. */
  budgetMinutes: number | null;
  actualMinutes: number;
  /** actual − budget; positive = over budget. Null when no budget. */
  diffMinutes: number | null;
}

export interface WeekSettlement {
  rows: SettlementRow[];
  totalActualMinutes: number;
  totalBudgetMinutes: number | null;
  /** Core + Supportive actual minutes — Lyubishchev's effective work time. */
  effectiveWorkMinutes: number;
  hasPlan: boolean;
}

/** Sums entry durations per category id. */
export function actualsByCategory(entries: TimeEntry[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    totals.set(
      entry.category_id,
      (totals.get(entry.category_id) ?? 0) + entry.duration_minutes,
    );
  }
  return totals;
}

/**
 * Live budget-vs-actual settlement for one week. Entries must already be
 * filtered to the week (by started_at — see getWeekStart/getWeekEnd).
 * With no plan, actuals are shown and over/under stays uncomputed (spec).
 * Categories appear when they have a budget or any actual time.
 */
export function computeWeekSettlement(
  categories: Category[],
  entries: TimeEntry[],
  planItems: PlanItem[] | null,
): WeekSettlement {
  const actuals = actualsByCategory(entries);
  const budgets = new Map<string, number>();
  if (planItems) {
    for (const item of planItems) {
      budgets.set(
        item.category_id,
        item.budgeted_minutes + item.rollover_minutes,
      );
    }
  }

  const rows: SettlementRow[] = [];
  let effectiveWorkMinutes = 0;

  for (const category of categories) {
    const actualMinutes = actuals.get(category.id) ?? 0;
    const budgetMinutes = budgets.get(category.id) ?? null;
    if (actualMinutes === 0 && budgetMinutes === null) continue;

    if (isEffectiveWork(category.category_group)) {
      effectiveWorkMinutes += actualMinutes;
    }

    rows.push({
      category,
      budgetMinutes,
      actualMinutes,
      diffMinutes:
        budgetMinutes === null ? null : actualMinutes - budgetMinutes,
    });
  }

  const totalActualMinutes = rows.reduce((s, r) => s + r.actualMinutes, 0);
  const hasPlan = planItems !== null && planItems.length > 0;

  return {
    rows,
    totalActualMinutes,
    totalBudgetMinutes: hasPlan
      ? rows.reduce((s, r) => s + (r.budgetMinutes ?? 0), 0)
      : null,
    effectiveWorkMinutes,
    hasPlan,
  };
}

/**
 * Per-category balance of one finished week: (budget + rollover) − actual.
 * Positive = surplus (time left unused), negative = deficit (overspent).
 * Only categories that had a budget produce a balance.
 */
export function computeWeekBalances(
  planItems: PlanItem[],
  entries: TimeEntry[],
): Map<string, number> {
  const actuals = actualsByCategory(entries);
  const balances = new Map<string, number>();
  for (const item of planItems) {
    const budget = item.budgeted_minutes + item.rollover_minutes;
    balances.set(
      item.category_id,
      budget - (actuals.get(item.category_id) ?? 0),
    );
  }
  return balances;
}

/** Signed minutes → "+2h 30m" / "−45m" / "0m". */
export function formatSignedDuration(minutes: number): string {
  if (minutes === 0) return "0m";
  const sign = minutes > 0 ? "+" : "−";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${sign}${m}m`;
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h ${m}m`;
}
