import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  computeBalanceContext,
  type CategoryBalance,
  type PastWeek,
} from "@/lib/planning";
import { getWeekEnd } from "@/lib/week";

type Client = SupabaseClient<Database>;

/**
 * Loads all planned weeks strictly before `targetWeekKey` and computes
 * per-category balance context (last balance, cumulative, recent weeks).
 */
export async function getBalanceContext(
  supabase: Client,
  userId: string,
  targetWeekKey: string,
): Promise<Map<string, CategoryBalance>> {
  const { data: plans } = await supabase
    .from("weekly_plans")
    .select("*")
    .eq("user_id", userId)
    .lt("week_start", targetWeekKey)
    .order("week_start", { ascending: false });

  if (!plans || plans.length === 0) return new Map();

  const { data: items } = await supabase
    .from("weekly_plan_items")
    .select("*")
    .in(
      "plan_id",
      plans.map((p) => p.id),
    );

  const earliest = plans[plans.length - 1].week_start;
  const lastWeekEnd = getWeekEnd(new Date(`${targetWeekKey}T00:00:00`));
  const { data: entries } = await supabase
    .from("time_entries")
    .select("*")
    .eq("user_id", userId)
    .gte("started_at", new Date(`${earliest}T00:00:00`).toISOString())
    .lt("started_at", lastWeekEnd.toISOString());

  const pastWeeks: PastWeek[] = plans.map((plan) => {
    const weekStart = new Date(`${plan.week_start}T00:00:00`);
    const weekEnd = getWeekEnd(weekStart);
    return {
      plan,
      items: (items ?? []).filter((i) => i.plan_id === plan.id),
      entries: (entries ?? []).filter((e) => {
        const started = new Date(e.started_at);
        return started >= weekStart && started < weekEnd;
      }),
    };
  });

  return computeBalanceContext(pastWeeks);
}
