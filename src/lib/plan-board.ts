import type { Tables } from "@/lib/database.types";
import type { TimeEntry } from "@/lib/entries";
import { actualsByCategory } from "@/lib/settlement";
import type { Category } from "@/lib/categories";
import { dayKey } from "@/lib/unrecorded";

export type PlannedItem = Tables<"planned_items">;

/** The 7 day keys (YYYY-MM-DD) of a Monday-started week. */
export function weekDayKeys(weekStart: Date): string[] {
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    keys.push(dayKey(d));
  }
  return keys;
}

/** Items per day of the week, each column sorted by position. */
export function groupItemsByDay(
  weekStart: Date,
  items: PlannedItem[],
): Map<string, PlannedItem[]> {
  const byDay = new Map<string, PlannedItem[]>(
    weekDayKeys(weekStart).map((key) => [key, []]),
  );
  for (const item of items) {
    byDay.get(item.day)?.push(item);
  }
  for (const column of byDay.values()) {
    column.sort((a, b) => a.position - b.position);
  }
  return byDay;
}

/** Total planned minutes per category id. */
export function plannedByCategory(items: PlannedItem[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const item of items) {
    totals.set(
      item.category_id,
      (totals.get(item.category_id) ?? 0) + item.expected_minutes,
    );
  }
  return totals;
}

/** Total planned minutes per day key. */
export function plannedByDay(items: PlannedItem[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const item of items) {
    totals.set(item.day, (totals.get(item.day) ?? 0) + item.expected_minutes);
  }
  return totals;
}

export interface CategoryStatus {
  category: Category;
  plannedMinutes: number;
  actualMinutes: number;
  /** actual − planned; negative = behind plan. */
  diffMinutes: number;
}

/**
 * Read-only execution status per category for a week: planned vs actual
 * with the signed difference. Categories with neither are omitted.
 */
export function computeWeekStatus(
  categories: Category[],
  items: PlannedItem[],
  entries: TimeEntry[],
): CategoryStatus[] {
  const planned = plannedByCategory(items);
  const actuals = actualsByCategory(entries);

  const rows: CategoryStatus[] = [];
  for (const category of categories) {
    const plannedMinutes = planned.get(category.id) ?? 0;
    const actualMinutes = actuals.get(category.id) ?? 0;
    if (plannedMinutes === 0 && actualMinutes === 0) continue;
    rows.push({
      category,
      plannedMinutes,
      actualMinutes,
      diffMinutes: actualMinutes - plannedMinutes,
    });
  }
  return rows;
}
