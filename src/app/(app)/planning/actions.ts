"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseDurationInput } from "@/lib/entries";
import { syncCalendarWeek } from "@/server/google-calendar";

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

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Adds a planned item to the bottom of a day's column. */
export async function addPlannedItem(
  day: string,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, user } = await getAuthed();

  if (!DAY_RE.test(day)) return { error: "Invalid day." };

  const categoryId = formData.get("category_id");
  if (typeof categoryId !== "string" || categoryId.length === 0) {
    return { error: "A category is required." };
  }

  const duration = parseDurationInput(String(formData.get("duration") ?? ""));
  if (duration === null) {
    return { error: "Duration must be minutes (90) or h:mm (1:30)." };
  }

  const { data: last } = await supabase
    .from("planned_items")
    .select("position")
    .eq("user_id", user.id)
    .eq("day", day)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("planned_items").insert({
    user_id: user.id,
    day,
    category_id: categoryId,
    expected_minutes: duration,
    position: (last?.position ?? -1) + 1,
  });
  if (error) return { error: error.message };

  revalidatePath("/planning");
  revalidatePath("/");
  return {};
}

export async function deletePlannedItem(id: string): Promise<ActionResult> {
  const { supabase } = await getAuthed();

  const { error } = await supabase.from("planned_items").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/planning");
  revalidatePath("/");
  return {};
}

/**
 * Persists a drag: the item moves to `day`, and each affected column's
 * new order is written back as positions.
 */
export async function movePlannedItem(
  id: string,
  day: string,
  orderedColumns: Record<string, string[]>,
): Promise<ActionResult> {
  const { supabase } = await getAuthed();

  if (!DAY_RE.test(day)) return { error: "Invalid day." };

  const { error: moveError } = await supabase
    .from("planned_items")
    .update({ day })
    .eq("id", id);
  if (moveError) return { error: moveError.message };

  for (const [columnDay, ids] of Object.entries(orderedColumns)) {
    if (!DAY_RE.test(columnDay)) continue;
    for (const [index, itemId] of ids.entries()) {
      const { error } = await supabase
        .from("planned_items")
        .update({ day: columnDay, position: index })
        .eq("id", itemId);
      if (error) return { error: error.message };
    }
  }

  revalidatePath("/planning");
  revalidatePath("/");
  return {};
}

/** Assigns (or clears) the category of a planned item — used for
 * calendar-synced items that arrive without one. */
export async function setPlannedItemCategory(
  id: string,
  categoryId: string | null,
): Promise<ActionResult> {
  const { supabase } = await getAuthed();

  const { error } = await supabase
    .from("planned_items")
    .update({ category_id: categoryId })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/planning");
  revalidatePath("/");
  return {};
}

/** Pulls the latest Google Calendar events into the week's board. */
export async function refreshCalendarSync(
  weekKey: string,
): Promise<
  ActionResult & { added?: number; updated?: number; removed?: number }
> {
  const { supabase, user } = await getAuthed();

  if (!DAY_RE.test(weekKey)) return { error: "Invalid week." };
  const weekStart = new Date(`${weekKey}T00:00:00`);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const result = await syncCalendarWeek(supabase, user.id, weekStart, weekEnd);
  if (result.error) return { error: result.error };

  revalidatePath("/planning");
  revalidatePath("/");
  return result;
}
