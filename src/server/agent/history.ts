import "server-only";

import type { UIMessage } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { toStoredRow, toUIMessage } from "@/lib/agent-messages";

type Client = SupabaseClient<Database>;

/** First 60 characters of the opening user message, used as a conversation title. */
export function titleFromFirstMessage(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length === 0) return "New conversation";
  return trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed;
}

function textOf(message: UIMessage): string {
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { text: string }).text)
    .join(" ");
}

/**
 * Loads the full message history for a conversation (not paginated — the
 * model needs everything within its token budget regardless of what the
 * client has scrolled into view).
 */
export async function loadFullHistory(
  supabase: Client,
  conversationId: string,
): Promise<UIMessage[]> {
  const { data } = await supabase
    .from("agent_messages")
    .select("id, role, parts, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  return (data ?? []).map(toUIMessage);
}

/** Creates a new conversation, titled from the first user message. */
export async function createConversation(
  supabase: Client,
  userId: string,
  firstUserMessage: UIMessage,
): Promise<string> {
  const { data, error } = await supabase
    .from("agent_conversations")
    .insert({
      user_id: userId,
      title: titleFromFirstMessage(textOf(firstUserMessage)),
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create conversation");
  }
  return data.id;
}

/** Confirms a conversation exists and belongs to this user (RLS also enforces this). */
export async function ownsConversation(
  supabase: Client,
  userId: string,
  conversationId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("agent_conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();
  return data !== null;
}

/**
 * Upsert, not insert: a tool-approval response resubmits the same
 * assistant message id with its approval part filled in, and once the
 * model resumes, onEnd's responseMessage extends that same id again (a
 * "continuation") rather than starting a new one. Both cases must land on
 * the same row instead of colliding with a duplicate-key error.
 */
export async function saveMessage(
  supabase: Client,
  conversationId: string,
  userId: string,
  message: UIMessage,
): Promise<void> {
  const row = toStoredRow(message);
  await supabase.from("agent_messages").upsert(
    {
      id: row.id,
      conversation_id: conversationId,
      user_id: userId,
      role: row.role,
      parts: row.parts,
    },
    { onConflict: "id" },
  );
}
