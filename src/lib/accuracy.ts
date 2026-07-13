export interface WeekHistory {
  /** Monday key of the week. */
  weekKey: string;
  /** Total planned minutes per category (from the day board). */
  planned: Map<string, number>;
  /** Total actual minutes per category. */
  actual: Map<string, number>;
}

export interface CategoryAccuracy {
  /** Average actual/planned ratio over planned weeks; 1 = on plan. */
  averageRatio: number;
  /** Number of planned weeks contributing to the average. */
  sampleWeeks: number;
}

/**
 * Historical estimation accuracy per category: mean of the per-week
 * actual/planned ratios across weeks where the category had a plan.
 * Ratio > 1 means the user habitually exceeds the plan.
 */
export function computeAccuracy(
  weeks: WeekHistory[],
): Map<string, CategoryAccuracy> {
  const ratios = new Map<string, number[]>();

  for (const week of weeks) {
    for (const [categoryId, plannedMinutes] of week.planned) {
      if (plannedMinutes <= 0) continue;
      const ratio = (week.actual.get(categoryId) ?? 0) / plannedMinutes;
      const list = ratios.get(categoryId);
      if (list) {
        list.push(ratio);
      } else {
        ratios.set(categoryId, [ratio]);
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

/** 1.52 → "152%". */
export function formatRatio(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

/**
 * A plan is likely overestimated when history says the category runs
 * meaningfully over plan (avg ratio ≥ threshold over ≥ 2 weeks).
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
