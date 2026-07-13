"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseCategoryInput } from "@/lib/categories";

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

export async function createCategory(
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, user } = await getAuthed();

  const parsed = parseCategoryInput({
    name: formData.get("name"),
    color: formData.get("color"),
    description: formData.get("description"),
  });
  if (!parsed.ok) return { error: parsed.error };

  const { error } = await supabase
    .from("categories")
    .insert({ ...parsed.input, user_id: user.id });
  if (error) return { error: error.message };

  revalidatePath("/categories");
  return {};
}

export async function updateCategory(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase } = await getAuthed();

  const parsed = parseCategoryInput({
    name: formData.get("name"),
    color: formData.get("color"),
    description: formData.get("description"),
  });
  if (!parsed.ok) return { error: parsed.error };

  const { error } = await supabase
    .from("categories")
    .update(parsed.input)
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/categories");
  return {};
}

export async function archiveCategory(id: string): Promise<ActionResult> {
  const { supabase } = await getAuthed();

  const { error } = await supabase
    .from("categories")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/categories");
  return {};
}

export async function unarchiveCategory(id: string): Promise<ActionResult> {
  const { supabase } = await getAuthed();

  const { error } = await supabase
    .from("categories")
    .update({ archived_at: null })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/categories");
  return {};
}

/**
 * Deletes a category. If it has time entries, it is archived instead so
 * historical statistics stay intact (per spec).
 */
export async function deleteCategory(id: string): Promise<ActionResult> {
  const { supabase } = await getAuthed();

  const { count, error: countError } = await supabase
    .from("time_entries")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);
  if (countError) return { error: countError.message };

  if ((count ?? 0) > 0) {
    return archiveCategory(id);
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/categories");
  return {};
}
