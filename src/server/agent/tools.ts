import "server-only";

import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { sortCategories } from "@/lib/categories";
import { summarizePeriod } from "@/lib/summary";
import { computeWeekSettlement } from "@/lib/settlement";
import { plannedByCategory } from "@/lib/plan-board";
import { computeAccuracy } from "@/lib/accuracy";
import { weekDayGaps } from "@/lib/unrecorded";
import { buildWeekReport } from "@/lib/agent-report";
import { addDaysKey, weekStartKeyOf, zonedDayStart } from "@/lib/tz";
import { getWeekHistory } from "@/server/planning";

type Client = SupabaseClient<Database>;

const dayKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a YYYY-MM-DD date");

export interface AgentToolContext {
  supabase: Client;
  userId: string;
  timeZone: string;
}

/** Half-open [from, to) instant range for a day-key span, inclusive of `to`. */
function rangeInstants(from: string, to: string, timeZone: string) {
  return {
    fromInstant: zonedDayStart(from, timeZone).toISOString(),
    toInstant: zonedDayStart(addDaysKey(to, 1), timeZone).toISOString(),
  };
}

/**
 * Read-only tools the AI Agent uses to answer questions and build the
 * Retro/Plan playbooks. Categories, principles, and existing memories are
 * already in the system prompt's stable prefix — these tools cover
 * everything that varies by date range: entries, planned items, settlement,
 * accuracy, and unrecorded-time gaps, plus one coarse `getWeekReport` that
 * bundles all of those for a single week in one call.
 *
 * Every query filters by `userId` in addition to relying on RLS — belt and
 * suspenders, since a tool bug here would otherwise silently leak nothing
 * (RLS still blocks cross-user reads) but should never rely on that alone.
 */
export function buildReadTools(ctx: AgentToolContext): ToolSet {
  const { supabase, userId, timeZone } = ctx;

  return {
    getCategories: tool({
      description:
        "List the user's categories, including archived ones and ones excluded from totals. Category descriptions are private AI context, not shown in the app UI.",
      inputSchema: z.object({}),
      execute: async () => {
        const { data } = await supabase
          .from("categories")
          .select("*")
          .eq("user_id", userId);
        return sortCategories(data ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          archived: c.archived_at !== null,
          excludedFromTotals: c.excluded_from_totals,
        }));
      },
    }),

    getPrinciples: tool({
      description:
        "List the user's personal principles (e.g. bedtime, daily caps) — the closest thing to explicit norms for judging whether a week went well.",
      inputSchema: z.object({}),
      execute: async () => {
        const { data } = await supabase
          .from("principles")
          .select("id, content")
          .eq("user_id", userId);
        return data ?? [];
      },
    }),

    getEntries: tool({
      description:
        "Raw time entries in a day range [from, to], inclusive. Use for looking at what actually happened, note text, and Todo task links.",
      inputSchema: z.object({
        from: dayKey.describe("First day (YYYY-MM-DD), inclusive"),
        to: dayKey.describe("Last day (YYYY-MM-DD), inclusive"),
      }),
      execute: async ({ from, to }) => {
        const { fromInstant, toInstant } = rangeInstants(from, to, timeZone);
        const { data } = await supabase
          .from("time_entries")
          .select(
            "id, category_id, started_at, duration_minutes, note, todo_task_title",
          )
          .eq("user_id", userId)
          .gte("started_at", fromInstant)
          .lt("started_at", toInstant)
          .is("deleted_at", null)
          .order("started_at");
        return data ?? [];
      },
    }),

    getSummary: tool({
      description:
        "Total minutes and entry count per category over a day range — the fast path for 'how many hours did I spend on X between A and B'.",
      inputSchema: z.object({
        from: dayKey.describe("First day (YYYY-MM-DD), inclusive"),
        to: dayKey.describe("Last day (YYYY-MM-DD), inclusive"),
      }),
      execute: async ({ from, to }) => {
        const { fromInstant, toInstant } = rangeInstants(from, to, timeZone);
        const [{ data: categories }, { data: entries }] = await Promise.all([
          supabase.from("categories").select("*").eq("user_id", userId),
          supabase
            .from("time_entries")
            .select("*")
            .eq("user_id", userId)
            .gte("started_at", fromInstant)
            .lt("started_at", toInstant)
            .is("deleted_at", null),
        ]);
        const summary = summarizePeriod(categories ?? [], entries ?? []);
        return {
          totalMinutes: summary.totalMinutes,
          excludedMinutes: summary.excludedMinutes,
          entryCount: summary.entryCount,
          categories: summary.categories.map((row) => ({
            categoryId: row.category.id,
            totalMinutes: row.totalMinutes,
            entryCount: row.entryCount,
          })),
        };
      },
    }),

    getPlannedItems: tool({
      description:
        "Planned board items in a day range [from, to], inclusive — what was scheduled, not what happened. Items with a gcalEventId are Google Calendar mirrors; never propose changing those.",
      inputSchema: z.object({
        from: dayKey.describe("First day (YYYY-MM-DD), inclusive"),
        to: dayKey.describe("Last day (YYYY-MM-DD), inclusive"),
      }),
      execute: async ({ from, to }) => {
        const { data } = await supabase
          .from("planned_items")
          .select("*")
          .eq("user_id", userId)
          .gte("day", from)
          .lte("day", to)
          .order("day");
        return (data ?? []).map((item) => ({
          id: item.id,
          day: item.day,
          categoryId: item.category_id,
          title: item.title,
          expectedMinutes: item.expected_minutes,
          isAllDay: item.is_all_day,
          gcalEventId: item.gcal_event_id,
        }));
      },
    }),

    getWeekSettlement: tool({
      description:
        "Planned-vs-actual settlement for a single Monday-starting week: per category planned, actual, and the diff.",
      inputSchema: z.object({
        weekStart: dayKey.describe(
          "Monday of the week (YYYY-MM-DD), e.g. 2026-08-17",
        ),
      }),
      execute: async ({ weekStart }) => {
        const weekKey = weekStartKeyOf(weekStart);
        const weekEnd = addDaysKey(weekKey, 6);
        const { fromInstant, toInstant } = rangeInstants(
          weekKey,
          weekEnd,
          timeZone,
        );
        const [{ data: categories }, { data: entries }, { data: items }] =
          await Promise.all([
            supabase.from("categories").select("*").eq("user_id", userId),
            supabase
              .from("time_entries")
              .select("*")
              .eq("user_id", userId)
              .gte("started_at", fromInstant)
              .lt("started_at", toInstant)
              .is("deleted_at", null),
            supabase
              .from("planned_items")
              .select("*")
              .eq("user_id", userId)
              .gte("day", weekKey)
              .lte("day", weekEnd),
          ]);
        const settlement = computeWeekSettlement(
          categories ?? [],
          entries ?? [],
          plannedByCategory(items ?? []),
        );
        return {
          weekStart: weekKey,
          hasPlan: settlement.hasPlan,
          rows: settlement.rows.map((row) => ({
            categoryId: row.category.id,
            plannedMinutes: row.plannedMinutes,
            actualMinutes: row.actualMinutes,
            diffMinutes: row.diffMinutes,
          })),
        };
      },
    }),

    getAccuracy: tool({
      description:
        "Historical estimation accuracy per category (average actual/planned ratio) over all fully planned weeks strictly before the given week. Ratio > 1 means the user habitually exceeds the plan.",
      inputSchema: z.object({
        asOfWeek: dayKey.describe(
          "Monday of the week to compare against (YYYY-MM-DD); accuracy covers weeks before it",
        ),
      }),
      execute: async ({ asOfWeek }) => {
        const weekKey = weekStartKeyOf(asOfWeek);
        const history = await getWeekHistory(
          supabase,
          userId,
          weekKey,
          timeZone,
        );
        return [...computeAccuracy(history)].map(([categoryId, acc]) => ({
          categoryId,
          averageRatio: acc.averageRatio,
          sampleWeeks: acc.sampleWeeks,
        }));
      },
    }),

    getDayGaps: tool({
      description:
        "Per-day recorded-vs-planned minutes for a Monday-starting week, including which categories filled each day's recorded time. Useful for spotting late nights or long unrecorded stretches (the last recorded entry's end time is the best available signal for when the day stopped).",
      inputSchema: z.object({
        weekStart: dayKey.describe("Monday of the week (YYYY-MM-DD)"),
      }),
      execute: async ({ weekStart }) => {
        const weekKey = weekStartKeyOf(weekStart);
        const weekEnd = addDaysKey(weekKey, 6);
        const { fromInstant, toInstant } = rangeInstants(
          weekKey,
          weekEnd,
          timeZone,
        );
        const [{ data: entries }, { data: items }] = await Promise.all([
          supabase
            .from("time_entries")
            .select("*")
            .eq("user_id", userId)
            .gte("started_at", fromInstant)
            .lt("started_at", toInstant)
            .is("deleted_at", null),
          supabase
            .from("planned_items")
            .select("day, expected_minutes")
            .eq("user_id", userId)
            .gte("day", weekKey)
            .lte("day", weekEnd),
        ]);
        const plannedByDay = new Map<string, number>();
        for (const item of items ?? []) {
          plannedByDay.set(
            item.day,
            (plannedByDay.get(item.day) ?? 0) + item.expected_minutes,
          );
        }
        return weekDayGaps(weekKey, entries ?? [], plannedByDay, timeZone);
      },
    }),

    getWeekReport: tool({
      description:
        "The full picture for one Monday-starting week in a single call: settlement, per-day gaps, and historical accuracy. Prefer this over calling getWeekSettlement/getDayGaps/getAccuracy separately when reviewing a whole week (e.g. for /retro).",
      inputSchema: z.object({
        weekStart: dayKey.describe("Monday of the week (YYYY-MM-DD)"),
      }),
      execute: async ({ weekStart }) => {
        const weekKey = weekStartKeyOf(weekStart);
        const weekEnd = addDaysKey(weekKey, 6);
        const { fromInstant, toInstant } = rangeInstants(
          weekKey,
          weekEnd,
          timeZone,
        );
        const [
          { data: categories },
          { data: entries },
          { data: plannedItems },
          history,
        ] = await Promise.all([
          supabase.from("categories").select("*").eq("user_id", userId),
          supabase
            .from("time_entries")
            .select("*")
            .eq("user_id", userId)
            .gte("started_at", fromInstant)
            .lt("started_at", toInstant)
            .is("deleted_at", null),
          supabase
            .from("planned_items")
            .select("*")
            .eq("user_id", userId)
            .gte("day", weekKey)
            .lte("day", weekEnd),
          getWeekHistory(supabase, userId, weekKey, timeZone),
        ]);

        const report = buildWeekReport({
          weekKey,
          timeZone,
          categories: categories ?? [],
          entries: entries ?? [],
          plannedItems: plannedItems ?? [],
          history,
        });

        return {
          weekStart: report.weekKey,
          hasPlan: report.settlement.hasPlan,
          settlement: report.settlement.rows.map((row) => ({
            categoryId: row.category.id,
            plannedMinutes: row.plannedMinutes,
            actualMinutes: row.actualMinutes,
            diffMinutes: row.diffMinutes,
          })),
          dayGaps: report.dayGaps,
          accuracy: report.accuracy,
        };
      },
    }),
  };
}
