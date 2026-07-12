"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseEntryInput } from "@/lib/entries";
import { decodeTaskOption } from "@/lib/tasks";

export interface ActionResult {
  error?: string;
}

async function getAuthed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

function entryValues(formData: FormData) {
  return {
    category_id: formData.get("category_id"),
    started_at: formData.get("started_at"),
    duration: formData.get("duration"),
    note: formData.get("note"),
  };
}

/** Quick add: log a past activity without a timer. */
export async function createEntry(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await getAuthed();

  const parsed = parseEntryInput(entryValues(formData));
  if (!parsed.ok) return { error: parsed.error };

  const task = decodeTaskOption(formData.get("task"));

  const { error } = await supabase.from("time_entries").insert({
    ...parsed.input,
    user_id: user.id,
    source: "manual",
    todo_task_id: task?.id ?? null,
    todo_task_title: task?.title ?? null,
  });
  if (error) return { error: error.message };

  revalidatePath("/entries");
  return {};
}

export async function updateEntry(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase } = await getAuthed();

  const parsed = parseEntryInput(entryValues(formData));
  if (!parsed.ok) return { error: parsed.error };

  const { error } = await supabase
    .from("time_entries")
    .update(parsed.input)
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/entries");
  return {};
}

export async function deleteEntry(id: string): Promise<ActionResult> {
  const { supabase } = await getAuthed();

  const { error } = await supabase.from("time_entries").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/entries");
  return {};
}

/** Clears the needs-confirmation flag on a capped timer entry. */
export async function confirmEntry(id: string): Promise<ActionResult> {
  const { supabase } = await getAuthed();

  const { error } = await supabase
    .from("time_entries")
    .update({ needs_confirmation: false })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/entries");
  return {};
}
