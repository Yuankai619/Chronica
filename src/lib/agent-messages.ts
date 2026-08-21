import type { UIMessage } from "ai";
import type { Json } from "@/lib/database.types";

/**
 * Hard ceiling on how much conversation history is sent to the model each
 * turn. gpt-5.6-terra's 1.05M window makes this generous on purpose — it's
 * a safety guard against pathological conversations, not a normal limit.
 */
export const DEFAULT_HISTORY_TOKEN_BUDGET = 200_000;

export interface StoredAgentMessage {
  id: string;
  role: "user" | "assistant" | "system";
  parts: Json;
  created_at: string;
}

/** DB row → AI SDK UIMessage, so tool cards and approval state re-render. */
export function toUIMessage(row: StoredAgentMessage): UIMessage {
  return {
    id: row.id,
    role: row.role,
    parts: (row.parts as UIMessage["parts"]) ?? [],
  };
}

export function toStoredRow(
  message: UIMessage,
): Pick<StoredAgentMessage, "id" | "role" | "parts"> {
  return {
    id: message.id,
    role: message.role,
    parts: message.parts as unknown as Json,
  };
}

/**
 * Rough token estimate (~4 chars/token) from a UIMessage's text content.
 * Good enough for a budget guard, not for billing.
 */
export function estimateMessageTokens(message: UIMessage): number {
  let chars = 0;
  for (const part of message.parts) {
    if (part.type === "text" || part.type === "reasoning") {
      chars += part.text.length;
    } else {
      // Tool calls/results and other structured parts: estimate from their
      // JSON size rather than ignoring them.
      chars += JSON.stringify(part).length;
    }
  }
  return Math.ceil(chars / 4);
}

export interface TruncateResult {
  messages: UIMessage[];
  /** How many of the oldest messages were dropped. */
  droppedCount: number;
}

/**
 * Keeps the most recent messages within a token budget, dropping whole
 * messages from the oldest end (never split mid-message) and inserting a
 * short system note in their place so the model knows history was
 * truncated instead of silently starting mid-conversation.
 */
export function truncateToTokenBudget(
  messages: UIMessage[],
  maxTokens: number,
): TruncateResult {
  const total = messages.reduce((sum, m) => sum + estimateMessageTokens(m), 0);
  if (total <= maxTokens) return { messages, droppedCount: 0 };

  const kept: UIMessage[] = [];
  let budget = maxTokens;
  for (let i = messages.length - 1; i >= 0; i--) {
    const tokens = estimateMessageTokens(messages[i]);
    if (kept.length > 0 && budget - tokens < 0) break;
    kept.unshift(messages[i]);
    budget -= tokens;
  }

  const droppedCount = messages.length - kept.length;
  if (droppedCount === 0) return { messages: kept, droppedCount };

  const note: UIMessage = {
    id: "truncation-note",
    role: "system",
    parts: [
      {
        type: "text",
        text: `[${droppedCount} earlier message(s) omitted to stay within the context budget.]`,
      },
    ],
  };
  return { messages: [note, ...kept], droppedCount };
}
