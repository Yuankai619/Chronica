import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { sortCategories } from "@/lib/categories";
import { dayKeyInTz } from "@/lib/tz";
import { listMemories } from "@/server/agent/memories";

type Client = SupabaseClient<Database>;

const PERSONA = `You are the Chronica AI Agent — a time-management assistant for a personal
Lyubishchev-style time ledger. You have direct read access to the user's
categories, planned items, time entries, and long-term memory via tools;
never guess numbers you could look up.

Conduct:
- Reply in whichever language the user's most recent message is written in.
- Be honest and concrete. Never fabricate a number, date, or pattern that
  isn't backed by a tool result.
- Category descriptions below are private AI context — never suggest
  displaying them in the app's execution/timer UI.
- Planned items with a gcalEventId are Google Calendar mirrors; never
  propose creating, editing, or deleting one.
- When you infer something that isn't a stored fact (e.g. guessing bedtime
  from the last entry of a day), say plainly that it's an inference.
- Use upsertMemory to record durable patterns/preferences/trends/constraints
  worth remembering across weeks — not a running summary of this chat. If
  the user confirms or corrects something already listed under Long-term
  memory, call upsertMemory with that memory's id to reconfirm/revise it
  rather than creating a near-duplicate. Use deleteMemory when a memory
  turns out to be wrong.`;

/**
 * The stable-prefix portion of the system prompt: slow-changing data
 * (categories, principles, memories, timezone, today) that stays identical
 * across an entire conversation so it hits the provider's prompt cache,
 * instead of being re-fetched via tool calls on every turn.
 */
export async function buildSystemPrompt(
  supabase: Client,
  userId: string,
  timeZone: string,
): Promise<string> {
  const [{ data: categories }, { data: principles }, memories] =
    await Promise.all([
      supabase.from("categories").select("*").eq("user_id", userId),
      supabase.from("principles").select("id, content").eq("user_id", userId),
      listMemories(supabase, userId),
    ]);

  const today = dayKeyInTz(new Date(), timeZone);
  const lines: string[] = [PERSONA];

  lines.push(`\n## Today\n${today} (user timezone: ${timeZone})`);

  lines.push(`\n## Categories`);
  if (categories && categories.length > 0) {
    for (const c of sortCategories(categories)) {
      lines.push(
        `- id=${c.id} name="${c.name}"${c.archived_at ? " (archived)" : ""}${c.excluded_from_totals ? " (excluded from totals)" : ""}${c.description ? ` — ${c.description}` : ""}`,
      );
    }
  } else {
    lines.push(`(no categories yet)`);
  }

  lines.push(`\n## Principles`);
  if (principles && principles.length > 0) {
    for (const p of principles) lines.push(`- ${p.content}`);
  } else {
    lines.push(`(none set)`);
  }

  lines.push(`\n## Long-term memory`);
  if (memories.length > 0) {
    for (const m of memories) {
      lines.push(
        `- [${m.kind}, confidence ${m.displayConfidence.toFixed(2)}${m.categoryId ? `, category=${m.categoryId}` : ""}] ${m.content} (id=${m.id})`,
      );
    }
  } else {
    lines.push(`(no memories recorded yet)`);
  }

  return lines.join("\n");
}
