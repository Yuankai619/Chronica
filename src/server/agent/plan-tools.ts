import "server-only";

import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type { AgentToolContext } from "@/server/agent/tools";
import { weekDayKeysOf, weekStartKeyOf } from "@/lib/tz";

const dayKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a YYYY-MM-DD date");

/**
 * Plan-writing tools. writeWeekPlan is the only tool in the whole agent
 * that mutates planning data, which is why it's the one tool gated by
 * streamText's toolApproval (see the chat route) — the user must approve
 * the exact item list before anything is written.
 *
 * The tool itself only ever inserts new rows: it never updates or deletes
 * an existing planned_items row, so it can't clobber a manual item or a
 * gcalEventId-carrying Google Calendar mirror no matter what the model
 * asks for. The Plan playbook is expected to call getPlannedItems first
 * and surface any existing items for the target days so the user can
 * decide whether adding alongside them still makes sense.
 */
export function buildPlanTools(ctx: AgentToolContext): ToolSet {
  const { supabase, userId } = ctx;

  return {
    writeWeekPlan: tool({
      description:
        "Write the approved plan for a week as new planned-board items. Insert-only — never touches existing items. Call getPlannedItems on the target week first and confirm with the user before calling this.",
      inputSchema: z.object({
        weekStart: dayKey.describe("Monday of the target week (YYYY-MM-DD)"),
        items: z
          .array(
            z.object({
              day: dayKey,
              categoryId: z.string().uuid(),
              expectedMinutes: z.number().int().positive(),
              title: z.string().min(1).max(200).optional(),
            }),
          )
          .min(1)
          .max(100),
      }),
      execute: async ({ weekStart, items }) => {
        const weekKey = weekStartKeyOf(weekStart);
        const validDays = new Set(weekDayKeysOf(weekKey));
        const outOfRange = items.filter((i) => !validDays.has(i.day));
        if (outOfRange.length > 0) {
          return {
            ok: false,
            error: `All items must fall within the week of ${weekKey}`,
          };
        }

        const { data, error } = await supabase
          .from("planned_items")
          .insert(
            items.map((item) => ({
              user_id: userId,
              day: item.day,
              category_id: item.categoryId,
              expected_minutes: item.expectedMinutes,
              title: item.title ?? null,
            })),
          )
          .select("id");
        if (error) {
          return { ok: false, error: error.message };
        }
        return { ok: true, inserted: data?.length ?? 0 };
      },
    }),
  };
}
