import type { Category } from "@/lib/categories";
import type { TimeEntry } from "@/lib/entries";

export interface CategorySummary {
  category: Category;
  totalMinutes: number;
  /** Number of sessions/entries — e.g. how many entertainment sessions. */
  entryCount: number;
}

export interface PeriodSummary {
  categories: CategorySummary[];
  totalMinutes: number;
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

  const rows: CategorySummary[] = [];

  for (const category of categories) {
    const agg = byCategory.get(category.id);
    if (!agg) continue;
    rows.push({
      category,
      totalMinutes: agg.total,
      entryCount: agg.count,
    });
  }

  rows.sort((a, b) => b.totalMinutes - a.totalMinutes);

  return {
    categories: rows,
    totalMinutes: rows.reduce((s, r) => s + r.totalMinutes, 0),
    entryCount: entries.length,
  };
}

/** Recorded minutes per month (0-11) for an annual trend. */
export function monthlyRecordedTrend(entries: TimeEntry[]): number[] {
  const months = new Array<number>(12).fill(0);
  for (const entry of entries) {
    months[new Date(entry.started_at).getMonth()] += entry.duration_minutes;
  }
  return months;
}
