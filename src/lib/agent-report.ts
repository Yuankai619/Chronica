import type { Category } from "@/lib/categories";
import type { TimeEntry } from "@/lib/entries";
import type { PlannedItem } from "@/lib/plan-board";
import { plannedByCategory, plannedByDay } from "@/lib/plan-board";
import { computeWeekSettlement, type WeekSettlement } from "@/lib/settlement";
import { computeAccuracy, type WeekHistory } from "@/lib/accuracy";
import { weekDayGaps, type DayGap } from "@/lib/unrecorded";

export interface CategoryAccuracyRow {
  categoryId: string;
  averageRatio: number;
  sampleWeeks: number;
}

export interface WeekReport {
  weekKey: string;
  settlement: WeekSettlement;
  dayGaps: DayGap[];
  accuracy: CategoryAccuracyRow[];
}

/**
 * A single-call combination of settlement, per-day recorded/planned gaps,
 * and historical estimation accuracy for one week — the "coarse" report the
 * /retro command reaches for first, instead of stitching four tool calls
 * together itself.
 */
export function buildWeekReport(params: {
  weekKey: string;
  timeZone: string;
  categories: Category[];
  /** Entries within this week only. */
  entries: TimeEntry[];
  /** Planned items within this week only. */
  plannedItems: PlannedItem[];
  /** Planned-vs-actual history for weeks strictly before this one. */
  history: WeekHistory[];
}): WeekReport {
  const { weekKey, timeZone, categories, entries, plannedItems, history } =
    params;

  const settlement = computeWeekSettlement(
    categories,
    entries,
    plannedByCategory(plannedItems),
  );
  const dayGaps = weekDayGaps(
    weekKey,
    entries,
    plannedByDay(plannedItems),
    timeZone,
  );
  const accuracy = [...computeAccuracy(history)].map(
    ([categoryId, acc]): CategoryAccuracyRow => ({
      categoryId,
      averageRatio: acc.averageRatio,
      sampleWeeks: acc.sampleWeeks,
    }),
  );

  return { weekKey, settlement, dayGaps, accuracy };
}
