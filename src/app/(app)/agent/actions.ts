"use server";

import { createClient } from "@/lib/supabase/server";
import {
  deleteConversation,
  listConversationsPage,
  listMessagesPage,
  type ConversationPage,
  type MessagePage,
} from "@/server/agent/conversations";

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
