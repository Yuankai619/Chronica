import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { UIMessage } from "ai";
import { toUIMessage } from "@/lib/agent-messages";

type Client = SupabaseClient<Database>;

export interface ConversationSummary {
  id: string;
  title: string;
  lastMessageAt: string;
}

export interface ConversationPage {
  items: ConversationSummary[];
  nextCursor: string | null;
}

const CONVERSATIONS_PAGE_SIZE = 20;
const MESSAGES_PAGE_SIZE = 30;

/** Conversation list, most-recently-active first, paged by last_message_at. */
export async function listConversationsPage(
  supabase: Client,
  userId: string,
  cursor: string | null,
): Promise<ConversationPage> {
  let query = supabase
    .from("agent_conversations")
    .select("id, title, last_message_at")
    .eq("user_id", userId)
    .order("last_message_at", { ascending: false })
    .limit(CONVERSATIONS_PAGE_SIZE);
  if (cursor) query = query.lt("last_message_at", cursor);

  const { data } = await query;
  const items = (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    lastMessageAt: row.last_message_at,
  }));
  const nextCursor =
    items.length === CONVERSATIONS_PAGE_SIZE
      ? items[items.length - 1].lastMessageAt
      : null;
  return { items, nextCursor };
}

export interface MessagePage {
  /** Oldest first, ready to render top-to-bottom. */
  items: UIMessage[];
  /** created_at cursor to fetch the page before this one, or null if this was the oldest. */
  nextCursor: string | null;
}

/**
 * One page of a conversation's messages, newest page first (i.e. the
 * initial call with no cursor returns the most recent messages — what a
 * freshly opened conversation should show — and each subsequent call with
 * the returned cursor walks further into the past).
 */
export async function listMessagesPage(
  supabase: Client,
  conversationId: string,
  cursor: string | null,
): Promise<MessagePage> {
  let query = supabase
    .from("agent_messages")
    .select("id, role, parts, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(MESSAGES_PAGE_SIZE);
  if (cursor) query = query.lt("created_at", cursor);

  const { data } = await query;
  const rows = data ?? [];
  const nextCursor =
    rows.length === MESSAGES_PAGE_SIZE
      ? rows[rows.length - 1].created_at
      : null;
  return { items: rows.toReversed().map(toUIMessage), nextCursor };
}

/** Hard delete; agent_messages cascade with the conversation. */
export async function deleteConversation(
  supabase: Client,
  userId: string,
  conversationId: string,
): Promise<void> {
  await supabase
    .from("agent_conversations")
    .delete()
    .eq("id", conversationId)
    .eq("user_id", userId);
}
