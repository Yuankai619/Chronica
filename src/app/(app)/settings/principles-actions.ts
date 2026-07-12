"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  error?: string;
}

export async function addPrinciple(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const content = String(formData.get("content") ?? "").trim();
  if (content.length === 0) return { error: "Write the principle first." };
  if (content.length > 500) return { error: "Keep it under 500 characters." };

  const { error } = await supabase
    .from("principles")
    .insert({ user_id: user.id, content });
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}

export async function deletePrinciple(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("principles").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}
