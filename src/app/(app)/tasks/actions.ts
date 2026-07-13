"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { completeTodoTask } from "@/server/microsoft";

export interface ActionResult {
  error?: string;
}

/**
 * Marks a task completed: syncs the status to Microsoft To Do, then
 * records it in completed_tasks (shown on the Completed-today tab until
 * the day ends).
 */
export async function completeTask(
  taskId: string,
  listId: string,
  title: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const synced = await completeTodoTask(supabase, user.id, listId, taskId);
  if (synced.error) return { error: synced.error };

  const { error } = await supabase
    .from("completed_tasks")
    .upsert(
      { user_id: user.id, task_id: taskId, list_id: listId, title },
      { onConflict: "user_id,task_id" },
    );
  if (error) return { error: error.message };

  revalidatePath("/tasks");
  revalidatePath("/");
  return {};
}
