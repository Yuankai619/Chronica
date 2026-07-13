"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseDurationInput } from "@/lib/entries";
import { weekDayKeys } from "@/lib/plan-board";
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

/**
 * Copies last week's manually-added planned items into the given week.
 * Calendar-synced items (gcal_event_id IS NOT NULL) are skipped.
 * Existing items in the target week are not touched.
 */
export async function copyLastWeekPlan(
  weekKey: string,
): Promise<ActionResult & { copied?: number }> {
  const { supabase, user } = await getAuthed();

  if (!DAY_RE.test(weekKey)) return { error: "Invalid week." };

  const weekStart = new Date(`${weekKey}T00:00:00`);
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const lastWeekDayKeys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(lastWeekStart);
    d.setDate(d.getDate() + i);
    lastWeekDayKeys.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  }

  // Fetch last week's manual items only.
  const { data: lastItems, error: fetchError } = await supabase
    .from("planned_items")
    .select("*")
    .eq("user_id", user.id)
    .gte("day", lastWeekDayKeys[0])
    .lte("day", lastWeekDayKeys[6])
    .is("gcal_event_id", null)
    .order("day")
    .order("position");

  if (fetchError) return { error: fetchError.message };
  if (!lastItems || lastItems.length === 0) return { copied: 0 };

  // Map last week's day keys to this week's day keys (same weekday offset).
  const dayMap = new Map<string, string>();
  for (let i = 0; i < 7; i++) {
    dayMap.set(lastWeekDayKeys[i], weekDayKeys(weekStart)[i]);
  }

  // Find current max position per target day so we append at the bottom.
  const { data: existingItems } = await supabase
    .from("planned_items")
    .select("day, position")
    .eq("user_id", user.id)
    .gte("day", weekDayKeys(weekStart)[0])
    .lte("day", weekDayKeys(weekStart)[6]);

  const maxPosByDay = new Map<string, number>();
  for (const item of existingItems ?? []) {
    maxPosByDay.set(
      item.day,
      Math.max(maxPosByDay.get(item.day) ?? -1, item.position),
    );
  }

  let copied = 0;
  for (const item of lastItems) {
    const targetDay = dayMap.get(item.day);
    if (!targetDay) continue;

    const nextPos = (maxPosByDay.get(targetDay) ?? -1) + 1;
    maxPosByDay.set(targetDay, nextPos);

    const { error: insertError } = await supabase.from("planned_items").insert({
      user_id: user.id,
      day: targetDay,
      category_id: item.category_id,
      expected_minutes: item.expected_minutes,
      position: nextPos,
    });
    if (insertError) return { error: insertError.message };
    copied++;
  }

  revalidatePath("/planning");
  revalidatePath("/");
  return { copied };
}

/** Updates a manual planned item's category and/or duration. */
export async function updatePlannedItem(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase } = await getAuthed();

  const categoryId = formData.get("category_id");
  if (typeof categoryId !== "string" || categoryId.length === 0) {
    return { error: "A category is required." };
  }

  const duration = parseDurationInput(String(formData.get("duration") ?? ""));
  if (duration === null) {
    return { error: "Duration must be minutes (90) or h:mm (1:30)." };
  }

  const { error } = await supabase
    .from("planned_items")
    .update({ category_id: categoryId, expected_minutes: duration })
    .eq("id", id)
    .is("gcal_event_id", null); // safety: only manual items
  if (error) return { error: error.message };

  revalidatePath("/planning");
  revalidatePath("/");
  return {};
}
