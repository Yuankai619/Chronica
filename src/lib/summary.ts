import type { CategoryGroup } from "@/lib/database.types";
import { isEffectiveWork, type Category } from "@/lib/categories";
import type { TimeEntry } from "@/lib/entries";

export interface CategorySummary {
  category: Category;
  totalMinutes: number;
  /** Number of sessions/entries — e.g. how many entertainment sessions. */
  entryCount: number;
}

export interface PeriodSummary {
  categories: CategorySummary[];
  groupTotals: Record<CategoryGroup, number>;
  totalMinutes: number;
  effectiveWorkMinutes: number;
  entryCount: number;
}

/** Aggregates entries (already filtered to the period) per category/group. */
export function summarizePeriod(
  categories: Category[],
  entries: TimeEntry[],
): PeriodSummary {
  const byCategory = new Map<string, { total: number; count: number }>();
  for (const entry of entries) {
    const agg = byCategory.get(entry.category_id) ?? { total: 0, count: 0 };
    agg.total += entry.duration_minutes;
    agg.count += 1;
    byCategory.set(entry.category_id, agg);
  }

  const groupTotals: Record<CategoryGroup, number> = {
    core: 0,
    supportive: 0,
    social: 0,
    rest: 0,
  };
  const rows: CategorySummary[] = [];
  let effectiveWorkMinutes = 0;

  for (const category of categories) {
    const agg = byCategory.get(category.id);
    if (!agg) continue;
    rows.push({
      category,
      totalMinutes: agg.total,
      entryCount: agg.count,
    });
    groupTotals[category.category_group] += agg.total;
    if (isEffectiveWork(category.category_group)) {
      effectiveWorkMinutes += agg.total;
    }
  }

  rows.sort((a, b) => b.totalMinutes - a.totalMinutes);

  return {
    categories: rows,
    groupTotals,
    totalMinutes: rows.reduce((s, r) => s + r.totalMinutes, 0),
    effectiveWorkMinutes,
    entryCount: entries.length,
  };
}

/** Effective work minutes per month (0-11) for an annual trend. */
export function monthlyEffectiveTrend(
  categories: Category[],
  entries: TimeEntry[],
): number[] {
  const effectiveIds = new Set(
    categories
      .filter((c) => isEffectiveWork(c.category_group))
      .map((c) => c.id),
  );
  const months = new Array<number>(12).fill(0);
  for (const entry of entries) {
    if (!effectiveIds.has(entry.category_id)) continue;
    months[new Date(entry.started_at).getMonth()] += entry.duration_minutes;
  }
  return months;
}
