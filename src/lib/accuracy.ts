import type { PastWeek } from "@/lib/planning";
import { actualsByCategory } from "@/lib/settlement";

export interface CategoryAccuracy {
  /** Average actual/budget ratio over planned weeks; 1 = on budget. */
  averageRatio: number;
  /** Number of planned weeks contributing to the average. */
  sampleWeeks: number;
}

/**
 * Historical estimation accuracy per category: mean of the per-week
 * actual/(budget+rollover) ratios across planned weeks with a positive
 * budget. Ratio > 1 means the user habitually overspends the budget.
 */
export function computeAccuracy(
  pastWeeks: PastWeek[],
): Map<string, CategoryAccuracy> {
  const ratios = new Map<string, number[]>();

  for (const week of pastWeeks) {
    const actuals = actualsByCategory(week.entries);
    for (const item of week.items) {
      const budget = item.budgeted_minutes + item.rollover_minutes;
      if (budget <= 0) continue;
      const ratio = (actuals.get(item.category_id) ?? 0) / budget;
      const list = ratios.get(item.category_id);
      if (list) {
        list.push(ratio);
      } else {
        ratios.set(item.category_id, [ratio]);
      }
    }
  }

  const accuracy = new Map<string, CategoryAccuracy>();
  for (const [categoryId, list] of ratios) {
    accuracy.set(categoryId, {
      averageRatio: list.reduce((s, r) => s + r, 0) / list.length,
      sampleWeeks: list.length,
    });
  }
  return accuracy;
}

/** 1.52 → "152%"; used for the planning-page accuracy column. */
export function formatRatio(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

/**
 * A plan is likely overestimated when history says the category runs
 * meaningfully over budget (avg ratio ≥ threshold over ≥ 2 weeks).
 */
export function isLikelyOverrun(
  accuracy: CategoryAccuracy | undefined,
  threshold = 1.2,
): boolean {
  return (
    !!accuracy &&
    accuracy.sampleWeeks >= 2 &&
    accuracy.averageRatio >= threshold
  );
}
