import { createClient } from "@/lib/supabase/server";
import { agentConfigured } from "@/server/agent/model";
import {
  listConversationsPage,
  listMessagesPage,
} from "@/server/agent/conversations";
import { ownsConversation } from "@/server/agent/history";
import { listMemories } from "@/server/agent/memories";
import { AgentShell } from "@/components/agent/agent-shell";

export const metadata = { title: "Agent — Chronica" };

export default async function AgentPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [conversations, memories] = await Promise.all([
    listConversationsPage(supabase, user!.id, null),
    listMemories(supabase, user!.id),
  ]);

  const activeConversationId =
    c && (await ownsConversation(supabase, user!.id, c)) ? c : null;

  const initialMessages = activeConversationId
    ? await listMessagesPage(supabase, activeConversationId, null)
    : null;

  return (
    <AgentShell
      key={activeConversationId ?? "new"}
      configured={agentConfigured()}
      initialConversationId={activeConversationId}
      initialConversations={conversations}
      initialMessages={initialMessages}
      initialMemories={memories}
    />
  );
}
