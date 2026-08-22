import type { Category } from "@/lib/categories";
import type { TimeEntry } from "@/lib/entries";
import { addDaysKey, dayKeyInTz, weekStartKeyOf } from "@/lib/tz";

export interface CategorySummary {
  category: Category;
  totalMinutes: number;
  /** Number of sessions/entries — e.g. how many entertainment sessions. */
  entryCount: number;
}

export interface PeriodSummary {
  categories: CategorySummary[];
  totalMinutes: number;
  /** Minutes from excluded categories, already left out of totalMinutes. */
  excludedMinutes: number;
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

  // Excluded categories keep their row and their own number; only the
  // total leaves them out.
  let totalMinutes = 0;
  let excludedMinutes = 0;
  for (const row of rows) {
    if (row.category.excluded_from_totals) excludedMinutes += row.totalMinutes;
    else totalMinutes += row.totalMinutes;
  }

  return {
    categories: rows,
    totalMinutes,
    excludedMinutes,
    entryCount: entries.length,
  };
}

export interface WeeklyBuckets {
  /** One total per week, aligned to the `weeks` array passed in. */
  total: number[];
  /** categoryId -> one total per week, same alignment. */
  byCategory: Record<string, number[]>;
}

/** Monday keys from `fromKey`'s week through `throughKey`'s week, ascending. */
export function weeklyHistoryWeeks(
  fromKey: string,
  throughKey: string,
): string[] {
  const weeks: string[] = [];
  for (
    let wk = weekStartKeyOf(fromKey);
    wk <= throughKey;
    wk = addDaysKey(wk, 7)
  ) {
    weeks.push(wk);
  }
  return weeks;
}

/**
 * Buckets recorded minutes into `weeks`, both as a total and per category.
 * `excludedFromTotal` categories are left out of `total` (matching how the
 * period summary's headline total works) but still get their own row in
 * `byCategory` — a category can always see its own history.
 */
export function bucketRecordedMinutesByWeek(
  entries: Pick<TimeEntry, "category_id" | "duration_minutes" | "started_at">[],
  weeks: string[],
  timeZone: string,
  excludedFromTotal: Set<string>,
): WeeklyBuckets {
  const index = new Map(weeks.map((wk, i) => [wk, i]));
  const total = new Array<number>(weeks.length).fill(0);
  const byCategory: Record<string, number[]> = {};
  for (const entry of entries) {
    const wk = weekStartKeyOf(dayKeyInTz(new Date(entry.started_at), timeZone));
    const i = index.get(wk);
    if (i === undefined) continue;
    if (!excludedFromTotal.has(entry.category_id))
      total[i] += entry.duration_minutes;
    const arr = (byCategory[entry.category_id] ??= new Array(weeks.length).fill(
      0,
    ));
    arr[i] += entry.duration_minutes;
  }
  return { total, byCategory };
}

/** Buckets planned minutes into `weeks`, both as a total and per category. */
export function bucketPlannedMinutesByWeek(
  items: {
    day: string;
    expected_minutes: number;
    category_id: string | null;
  }[],
  weeks: string[],
): WeeklyBuckets {
  const index = new Map(weeks.map((wk, i) => [wk, i]));
  const total = new Array<number>(weeks.length).fill(0);
  const byCategory: Record<string, number[]> = {};
  for (const item of items) {
    const wk = weekStartKeyOf(item.day);
    const i = index.get(wk);
    if (i === undefined) continue;
    total[i] += item.expected_minutes;
    if (item.category_id) {
      const arr = (byCategory[item.category_id] ??= new Array(
        weeks.length,
      ).fill(0));
      arr[i] += item.expected_minutes;
    }
  }
  return { total, byCategory };
}
