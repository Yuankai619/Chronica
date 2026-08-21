import { NextResponse } from "next/server";
import { z } from "zod";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { createClient } from "@/lib/supabase/server";
import { getUserTimeZone } from "@/server/tz";
import {
  agentConfigured,
  agentModel,
  AGENT_PROVIDER_OPTIONS,
} from "@/server/agent/model";
import { buildSystemPrompt } from "@/server/agent/context";
import { buildReadTools } from "@/server/agent/tools";
import {
  createConversation,
  loadFullHistory,
  ownsConversation,
  saveMessage,
} from "@/server/agent/history";
import {
  DEFAULT_HISTORY_TOKEN_BUDGET,
  truncateToTokenBudget,
} from "@/lib/agent-messages";

export const maxDuration = 120;

const uiMessagePartSchema = z.looseObject({ type: z.string() });

const bodySchema = z.object({
  conversationId: z.uuid().nullable(),
  message: z.object({
    id: z.uuid(),
    role: z.literal("user"),
    parts: z.array(uiMessagePartSchema).min(1),
  }),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!agentConfigured()) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured on the server." },
      { status: 503 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }
  const { conversationId: requestedConversationId, message } = parsed.data;
  const userMessage = message as UIMessage;

  let conversationId = requestedConversationId;
  if (conversationId) {
    if (!(await ownsConversation(supabase, user.id, conversationId))) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }
  } else {
    conversationId = await createConversation(supabase, user.id, userMessage);
  }

  await saveMessage(supabase, conversationId, user.id, userMessage);

  const timeZone = await getUserTimeZone();
  const [systemPrompt, history] = await Promise.all([
    buildSystemPrompt(supabase, user.id, timeZone),
    loadFullHistory(supabase, conversationId),
  ]);
  const { messages } = truncateToTokenBudget(
    history,
    DEFAULT_HISTORY_TOKEN_BUDGET,
  );

  const tools = buildReadTools({ supabase, userId: user.id, timeZone });
  const finalConversationId = conversationId;

  const result = streamText({
    model: agentModel(),
    system: systemPrompt,
    messages: await convertToModelMessages(messages, { tools }),
    tools,
    providerOptions: AGENT_PROVIDER_OPTIONS,
  });

  const uiStream = toUIMessageStream({
    stream: result.stream,
    originalMessages: [userMessage],
    generateMessageId: () => crypto.randomUUID(),
    // Carried on every streamed part so the client learns the conversation
    // id from the very first chunk — needed when this turn just created it.
    messageMetadata: () => ({ conversationId: finalConversationId }),
    onEnd: async ({ responseMessage }) => {
      await saveMessage(
        supabase,
        finalConversationId,
        user.id,
        responseMessage,
      );
    },
  });
  return createUIMessageStreamResponse({ stream: uiStream });
}
