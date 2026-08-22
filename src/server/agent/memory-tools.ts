import "server-only";

import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type { AgentToolContext } from "@/server/agent/tools";
import { deleteMemory, upsertMemory } from "@/server/agent/memories";

/**
 * Memory-maintenance tools. Unlike writeWeekPlan (later PR), these run
 * without approval — the write is cheap to review after the fact in the
 * Memory drawer, and gating every single observation behind a confirmation
 * would make the Retro/Plan playbooks unusable. upsertMemory prunes the
 * least-confident rows past the cap itself, so old memories age out without
 * a separate maintenance step.
 */
export function buildMemoryTools(ctx: AgentToolContext): ToolSet {
  const { supabase, userId } = ctx;

  return {
    upsertMemory: tool({
      description:
        "Record or reconfirm a durable observation about the user's productivity habits. Pass an existing memory's id (shown in the Long-term memory section of this prompt) to update/reconfirm it instead of creating a duplicate.",
      inputSchema: z.object({
        id: z
          .string()
          .uuid()
          .optional()
          .describe("Existing memory id to update, if reconfirming one"),
        kind: z.enum(["pattern", "preference", "trend", "constraint"]),
        content: z
          .string()
          .min(1)
          .max(1000)
          .describe(
            "One durable, concrete observation — not a summary of this conversation",
          ),
        categoryId: z
          .string()
          .uuid()
          .nullable()
          .optional()
          .describe(
            "Scope to one category, or omit/null for a general observation",
          ),
        confidence: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe("0-1; defaults to 0.7 for a new memory"),
      }),
      execute: async (input) => {
        const memory = await upsertMemory(supabase, userId, input);
        return {
          id: memory.id,
          kind: memory.kind,
          content: memory.content,
          confidence: memory.confidence,
        };
      },
    }),

    deleteMemory: tool({
      description:
        "Delete a memory that turned out to be wrong or no longer useful. Use the id shown in the Long-term memory section of this prompt.",
      inputSchema: z.object({
        id: z.string().uuid(),
      }),
      execute: async ({ id }) => {
        await deleteMemory(supabase, userId, id);
        return { id, deleted: true };
      },
    }),
  };
}
