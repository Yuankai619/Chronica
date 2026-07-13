import { isEffectiveWork, type Category } from "@/lib/categories";
import type { TimeEntry } from "@/lib/entries";

export interface SettlementRow {
  category: Category;
  /** Planned minutes for the week; null when nothing was planned. */
  plannedMinutes: number | null;
  actualMinutes: number;
  /** actual − planned; positive = over plan. Null when nothing planned. */
  diffMinutes: number | null;
}

export interface WeekSettlement {
  rows: SettlementRow[];
  totalActualMinutes: number;
  totalPlannedMinutes: number | null;
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
 * Live planned-vs-actual settlement for one week. Entries must already be
 * filtered to the week (by started_at); `planned` is total planned minutes
 * per category from the week's board items. With no plan, actuals are
 * shown and over/under stays uncomputed.
 */
export function computeWeekSettlement(
  categories: Category[],
  entries: TimeEntry[],
  planned: Map<string, number>,
): WeekSettlement {
  const actuals = actualsByCategory(entries);
  const hasPlan = planned.size > 0;

  const rows: SettlementRow[] = [];
  let effectiveWorkMinutes = 0;

  for (const category of categories) {
    const actualMinutes = actuals.get(category.id) ?? 0;
    const plannedMinutes = hasPlan ? (planned.get(category.id) ?? null) : null;
    if (actualMinutes === 0 && plannedMinutes === null) continue;

    if (isEffectiveWork(category.category_group)) {
      effectiveWorkMinutes += actualMinutes;
    }

    rows.push({
      category,
      plannedMinutes,
      actualMinutes,
      diffMinutes:
        plannedMinutes === null ? null : actualMinutes - plannedMinutes,
    });
  }

  return {
    rows,
    totalActualMinutes: rows.reduce((s, r) => s + r.actualMinutes, 0),
    totalPlannedMinutes: hasPlan
      ? rows.reduce((s, r) => s + (r.plannedMinutes ?? 0), 0)
      : null,
    effectiveWorkMinutes,
    hasPlan,
  };
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
