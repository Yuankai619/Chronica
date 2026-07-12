"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseDurationInput } from "@/lib/entries";

export interface ActionResult {
  error?: string;
}

export async function saveSettings(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const capRaw = String(formData.get("timer_cap") ?? "");
  const targetRaw = String(formData.get("daily_target") ?? "");

  const cap = parseDurationInput(capRaw);
  if (cap === null || cap < 15) {
    return { error: "Timer cap must be at least 15 minutes." };
  }

  const target = targetRaw.trim() === "0" ? 0 : parseDurationInput(targetRaw);
  if (target === null) {
    return { error: "Daily target must be minutes (840) or h:mm (14:00)." };
  }

  const { error } = await supabase.from("user_settings").upsert({
    user_id: user.id,
    timer_cap_minutes: cap,
    daily_target_minutes: target,
  });
  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/week");
  return {};
}
