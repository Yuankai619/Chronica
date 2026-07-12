"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getCapMinutes,
  getReconciledSession,
  saveAndClearSession,
} from "@/server/timer";
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

/**
 * Starts a timer on a category. If another timer is running it is stopped
 * and saved first (spec: only one timer at a time). The unique index on
 * timer_sessions.user_id makes rapid double-starts create only one session.
 */
export async function startTimer(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await getAuthed();

  const categoryId = formData.get("category_id");
  if (typeof categoryId !== "string" || categoryId.length === 0) {
    return { error: "A category is required." };
  }

  const rawExpected = formData.get("expected_minutes");
  let expectedMinutes: number | null = null;
  if (typeof rawExpected === "string" && rawExpected.trim() !== "") {
    const parsed = Number(rawExpected);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return { error: "Expected duration must be a positive whole number." };
    }
    expectedMinutes = parsed;
  }

  // Stop-and-save any running session (also reconciles a capped one).
  const current = await getReconciledSession(supabase, user.id);
  if (current) {
    const saved = await saveAndClearSession(supabase, current, new Date());
    if (saved.error) return saved;
  }

  const task = decodeTaskOption(formData.get("task"));

  const cap = await getCapMinutes(supabase, user.id);
  const { error } = await supabase.from("timer_sessions").insert({
    user_id: user.id,
    category_id: categoryId,
    expected_minutes: expectedMinutes,
    cap_minutes: cap,
    todo_task_id: task?.id ?? null,
    todo_task_title: task?.title ?? null,
  });
  // 23505 = another session already exists (double-click) — treat as success.
  if (error && error.code !== "23505") return { error: error.message };

  revalidatePath("/");
  return {};
}

/** Stops the running timer and saves it as a time entry. */
export async function stopTimer(): Promise<ActionResult> {
  const { supabase, user } = await getAuthed();

  const session = await getReconciledSession(supabase, user.id);
  if (!session) {
    // Already reconciled or nothing running — the page will refresh.
    revalidatePath("/");
    return {};
  }

  const saved = await saveAndClearSession(supabase, session, new Date());
  if (saved.error) return saved;

  revalidatePath("/");
  return {};
}
