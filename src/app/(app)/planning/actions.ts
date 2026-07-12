"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseDurationInput } from "@/lib/entries";
import { parsePlanInput } from "@/lib/planning";
import { getBalanceContext } from "@/server/planning";

export interface ActionResult {
  error?: string;
}

/**
 * Saves (or replaces) the weekly plan for the given Monday. Rollover
 * amounts are snapshotted from the balances computed at save time; later
 * edits to past weeks never change a saved plan (spec).
 */
export async function savePlan(
  weekKey: string,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekKey)) {
    return { error: "Invalid week." };
  }

  const balances = await getBalanceContext(supabase, user.id, weekKey);
  const parsed = parsePlanInput(
    [...formData.entries()],
    balances,
    parseDurationInput,
  );
  if (!parsed.ok) return { error: parsed.error };

  const { data: plan, error: planError } = await supabase
    .from("weekly_plans")
    .upsert(
      { user_id: user.id, week_start: weekKey },
      { onConflict: "user_id,week_start" },
    )
    .select()
    .single();
  if (planError) return { error: planError.message };

  // Replace items atomically enough for a single-user tool.
  const { error: clearError } = await supabase
    .from("weekly_plan_items")
    .delete()
    .eq("plan_id", plan.id);
  if (clearError) return { error: clearError.message };

  const { error: insertError } = await supabase
    .from("weekly_plan_items")
    .insert(parsed.items.map((item) => ({ ...item, plan_id: plan.id })));
  if (insertError) return { error: insertError.message };

  revalidatePath("/planning");
  revalidatePath("/week");
  return {};
}
