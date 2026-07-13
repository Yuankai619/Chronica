import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { WeekHistory } from "@/lib/accuracy";
import { actualsByCategory } from "@/lib/settlement";
import { plannedByCategory } from "@/lib/plan-board";
import { dayKeyInTz, weekStartKeyOf, zonedDayStart } from "@/lib/tz";

type Client = SupabaseClient<Database>;

/**
 * Planned-vs-actual history per week (Monday keys) for all weeks strictly
 * before `targetWeekKey`, built from the day-based planning board. Only
 * weeks that had at least one planned item are included.
 */
export async function getWeekHistory(
  supabase: Client,
  userId: string,
  targetWeekKey: string,
  timeZone: string,
): Promise<WeekHistory[]> {
  const { data: items } = await supabase
    .from("planned_items")
    .select("*")
    .eq("user_id", userId)
    .lt("day", targetWeekKey);
  if (!items || items.length === 0) return [];

  const itemsByWeek = new Map<string, typeof items>();
  for (const item of items) {
    const weekKey = weekStartKeyOf(item.day);
    if (weekKey >= targetWeekKey) continue;
    const bucket = itemsByWeek.get(weekKey);
    if (bucket) {
      bucket.push(item);
    } else {
      itemsByWeek.set(weekKey, [item]);
    }
  }
  if (itemsByWeek.size === 0) return [];

  const weekKeys = [...itemsByWeek.keys()].sort();
  const earliest = zonedDayStart(weekKeys[0], timeZone);
  const end = zonedDayStart(targetWeekKey, timeZone);

  const { data: entries } = await supabase
    .from("time_entries")
    .select("*")
    .eq("user_id", userId)
    .gte("started_at", earliest.toISOString())
    .lt("started_at", end.toISOString());

  const entriesByWeek = new Map<string, NonNullable<typeof entries>>();
  for (const entry of entries ?? []) {
    const weekKey = weekStartKeyOf(
      dayKeyInTz(new Date(entry.started_at), timeZone),
    );
    const bucket = entriesByWeek.get(weekKey);
    if (bucket) {
      bucket.push(entry);
    } else {
      entriesByWeek.set(weekKey, [entry]);
    }
  }

  return weekKeys.map((weekKey) => ({
    weekKey,
    planned: plannedByCategory(itemsByWeek.get(weekKey)!),
    actual: actualsByCategory(entriesByWeek.get(weekKey) ?? []),
  }));
}
