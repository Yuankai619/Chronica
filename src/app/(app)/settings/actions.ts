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

  const cap = parseDurationInput(String(formData.get("timer_cap") ?? ""));
  if (cap === null || cap < 15) {
    return { error: "Timer cap must be at least 15 minutes." };
  }

  const { error } = await supabase.from("user_settings").upsert({
    user_id: user.id,
    timer_cap_minutes: cap,
  });
  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/week");
  return {};
}

/** Removes the linked Microsoft account and its tokens. */
export async function unlinkMicrosoft(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("microsoft_accounts")
    .delete()
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}
