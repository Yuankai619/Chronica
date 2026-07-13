import "server-only";

import { Agent } from "@mastra/core/agent";
import { createOpenAI } from "@ai-sdk/openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { computeAccuracy, formatRatio } from "@/lib/accuracy";
import { formatDuration } from "@/lib/entries";
import { computeWeekSettlement } from "@/lib/settlement";
import { formatSignedDuration } from "@/lib/settlement";
import { getWeekEnd } from "@/lib/week";
import { getWeekHistory } from "@/server/planning";
import { plannedByCategory } from "@/lib/plan-board";

type Client = SupabaseClient<Database>;

const MAX_MEMORIES = 30;

export function retroConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

function buildAgent(): Agent {
  const provider = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
  });
  return new Agent({
    id: "chronica-retro",
    name: "chronica-retro",
    instructions: `You are the weekly retro analyst for Chronica, a Lyubishchev-style time ledger.
Be honest and concrete; never fabricate numbers or patterns that are not in the data.
If the data covers fewer than 2 fully planned weeks, say so and give only limited observations.
Your output MUST be a single JSON object with exactly these keys:
{"retro_markdown": string, "new_memories": string[]}
- retro_markdown: a markdown retro with sections: "Last week" (where budgets were exceeded/missed, notable patterns),
  "Reality check" (for each next-week budget likely overestimated, cite the historical ratio as evidence),
  and "Principles" (likely violations of the user's principles, citing the specific entries, e.g. late-night sessions).
- new_memories: 0-3 short durable observations about the user's working patterns worth remembering across weeks
  (real pace per category, recurring overruns). Do not repeat existing memories.`,
    model: provider(process.env.OPENAI_MODEL ?? "gpt-4o-mini"),
  });
}

async function buildContext(
  supabase: Client,
  userId: string,
  reviewWeekKey: string,
): Promise<string> {
  const weekStart = new Date(`${reviewWeekKey}T00:00:00`);
  const weekEnd = getWeekEnd(weekStart);
  const nextWeekKey = weekEnd.toISOString().slice(0, 10);

  const nextWeekEnd = new Date(weekEnd);
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);

  const [
    { data: categories },
    { data: entries },
    { data: plannedItems },
    { data: principles },
    { data: memories },
    history,
  ] = await Promise.all([
    supabase.from("categories").select("*"),
    supabase
      .from("time_entries")
      .select("*")
      .gte("started_at", weekStart.toISOString())
      .lt("started_at", weekEnd.toISOString()),
    supabase
      .from("planned_items")
      .select("*")
      .gte("day", reviewWeekKey)
      .lt("day", nextWeekEnd.toISOString().slice(0, 10)),
    supabase.from("principles").select("*"),
    supabase.from("ai_memories").select("*").order("created_at"),
    getWeekHistory(supabase, userId, nextWeekKey),
  ]);

  const reviewItems = (plannedItems ?? []).filter((i) => i.day < nextWeekKey);
  const nextItems = (plannedItems ?? []).filter((i) => i.day >= nextWeekKey);
  const reviewPlanned = plannedByCategory(reviewItems);
  const nextPlanned = plannedByCategory(nextItems);

  const categoryById = new Map((categories ?? []).map((c) => [c.id, c]));
  const name = (id: string) => categoryById.get(id)?.name ?? id;

  const settlement = computeWeekSettlement(
    categories ?? [],
    entries ?? [],
    reviewPlanned,
  );
  const accuracy = computeAccuracy(history);

  const lines: string[] = [];
  lines.push(`# Review week ${reviewWeekKey}`);
  lines.push(`Fully planned weeks of history: ${history.length}`);

  lines.push(`\n## Categories (descriptions are private AI context)`);
  for (const c of categories ?? []) {
    lines.push(
      `- ${c.name} [${c.category_group}]${c.archived_at ? " (archived)" : ""}${c.description ? `: ${c.description}` : ""}`,
    );
  }

  lines.push(`\n## Settlement for ${reviewWeekKey}`);
  if (!settlement.hasPlan) lines.push(`(nothing was planned for this week)`);
  for (const row of settlement.rows) {
    lines.push(
      `- ${row.category.name}: planned ${row.plannedMinutes === null ? "unset" : formatDuration(row.plannedMinutes)}, actual ${formatDuration(row.actualMinutes)}${row.diffMinutes === null ? "" : `, diff ${formatSignedDuration(row.diffMinutes)}`}`,
    );
  }
  lines.push(
    `Effective work (core+supportive): ${formatDuration(settlement.effectiveWorkMinutes)}`,
  );

  lines.push(`\n## Entries (start time, category, duration, task, note)`);
  for (const e of (entries ?? []).slice(0, 200)) {
    lines.push(
      `- ${e.started_at} | ${name(e.category_id)} | ${formatDuration(e.duration_minutes)}${e.todo_task_title ? ` | task: ${e.todo_task_title}` : ""}${e.note ? ` | note: ${e.note}` : ""}`,
    );
  }

  lines.push(`\n## Historical estimation accuracy (actual/budget)`);
  for (const [categoryId, acc] of accuracy) {
    lines.push(
      `- ${name(categoryId)}: avg ${formatRatio(acc.averageRatio)} over ${acc.sampleWeeks} week(s)`,
    );
  }

  lines.push(`\n## Next week's plan (${nextWeekKey})`);
  if (nextPlanned.size > 0) {
    for (const [categoryId, minutes] of nextPlanned) {
      lines.push(`- ${name(categoryId)}: planned ${formatDuration(minutes)}`);
    }
  } else {
    lines.push(`(not planned yet)`);
  }

  lines.push(`\n## User principles`);
  for (const p of principles ?? []) lines.push(`- ${p.content}`);

  lines.push(`\n## Existing long-term memories`);
  for (const m of memories ?? []) lines.push(`- ${m.content}`);

  return lines.join("\n");
}

export interface RetroResult {
  content?: string;
  error?: string;
}

/** Runs the AI retro for a review week, stores it, and updates memories. */
export async function runRetro(
  supabase: Client,
  userId: string,
  reviewWeekKey: string,
): Promise<RetroResult> {
  if (!retroConfigured()) {
    return { error: "OPENAI_API_KEY is not configured on the server." };
  }

  // Never analyze an empty week (also enforced by the UI).
  const reviewStart = new Date(`${reviewWeekKey}T00:00:00`);
  const { count } = await supabase
    .from("time_entries")
    .select("id", { count: "exact", head: true })
    .gte("started_at", reviewStart.toISOString())
    .lt("started_at", getWeekEnd(reviewStart).toISOString());
  if ((count ?? 0) === 0) {
    return { error: "Last week has no recorded entries to review." };
  }

  const context = await buildContext(supabase, userId, reviewWeekKey);
  const agent = buildAgent();

  let text: string;
  try {
    const result = await agent.generate(context);
    text = result.text;
  } catch (error) {
    return {
      error: `LLM call failed: ${error instanceof Error ? error.message : "unknown"}`,
    };
  }

  let retroMarkdown = text;
  let newMemories: string[] = [];
  try {
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as {
      retro_markdown?: string;
      new_memories?: string[];
    };
    if (typeof parsed.retro_markdown === "string") {
      retroMarkdown = parsed.retro_markdown;
      newMemories = (parsed.new_memories ?? []).filter(
        (m): m is string => typeof m === "string" && m.length > 0,
      );
    }
  } catch {
    // Model ignored the JSON contract — keep the raw text as the retro.
  }

  const { error: retroError } = await supabase
    .from("retros")
    .upsert(
      { user_id: userId, week_start: reviewWeekKey, content: retroMarkdown },
      { onConflict: "user_id,week_start" },
    );
  if (retroError) return { error: retroError.message };

  if (newMemories.length > 0) {
    await supabase.from("ai_memories").insert(
      newMemories.slice(0, 3).map((content) => ({
        user_id: userId,
        content: content.slice(0, 1000),
      })),
    );
    // Keep the memory list bounded, dropping the oldest.
    const { data: all } = await supabase
      .from("ai_memories")
      .select("id")
      .order("created_at", { ascending: false });
    if (all && all.length > MAX_MEMORIES) {
      await supabase
        .from("ai_memories")
        .delete()
        .in(
          "id",
          all.slice(MAX_MEMORIES).map((m) => m.id),
        );
    }
  }

  return { content: retroMarkdown };
}
