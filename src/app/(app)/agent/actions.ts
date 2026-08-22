"use server";

import { createClient } from "@/lib/supabase/server";
import {
  deleteConversation,
  listConversationsPage,
  listMessagesPage,
  type ConversationPage,
  type MessagePage,
} from "@/server/agent/conversations";
import {
  deleteMemory,
  listMemories,
  upsertMemory,
  type MemoryRow,
} from "@/server/agent/memories";

async function getAuthed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function listConversationsAction(
  cursor: string | null,
): Promise<ConversationPage> {
  const { supabase, user } = await getAuthed();
  return listConversationsPage(supabase, user.id, cursor);
}

export async function listMessagesAction(
  conversationId: string,
  cursor: string | null,
): Promise<MessagePage> {
  const { supabase } = await getAuthed();
  return listMessagesPage(supabase, conversationId, cursor);
}

export async function deleteConversationAction(
  conversationId: string,
): Promise<void> {
  const { supabase, user } = await getAuthed();
  await deleteConversation(supabase, user.id, conversationId);
}

/** Manual edit from the Memory drawer: keeps the memory's kind/category/confidence, updates content. */
export async function updateMemoryContentAction(
  id: string,
  kind: MemoryRow["kind"],
  content: string,
  categoryId: string | null,
): Promise<void> {
  const { supabase, user } = await getAuthed();
  await upsertMemory(supabase, user.id, { id, kind, content, categoryId });
}

export async function deleteMemoryAction(id: string): Promise<void> {
  const { supabase, user } = await getAuthed();
  await deleteMemory(supabase, user.id, id);
}

/** Re-fetches the full memory list — called after the agent writes memories mid-conversation. */
export async function listMemoriesAction(): Promise<MemoryRow[]> {
  const { supabase, user } = await getAuthed();
  return listMemories(supabase, user.id);
}
