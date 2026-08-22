import { NextResponse } from "next/server";
import { z } from "zod";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  stepCountIs,
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
import { buildMemoryTools } from "@/server/agent/memory-tools";
import { buildPlanTools } from "@/server/agent/plan-tools";
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
    // "assistant" here means a tool-approval response: the client resubmits
    // the same assistant message id with its approval part filled in,
    // rather than sending a new user message.
    role: z.enum(["user", "assistant"]),
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
  const incomingMessage = message as UIMessage;
  const isApprovalResponse = incomingMessage.role === "assistant";

  let conversationId = requestedConversationId;
  if (conversationId) {
    if (!(await ownsConversation(supabase, user.id, conversationId))) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }
  } else {
    if (isApprovalResponse) {
      return NextResponse.json(
        { error: "Cannot start a conversation with an approval response" },
        { status: 400 },
      );
    }
    conversationId = await createConversation(
      supabase,
      user.id,
      incomingMessage,
    );
  }

  await saveMessage(supabase, conversationId, user.id, incomingMessage);

  const timeZone = await getUserTimeZone();
  const [systemPrompt, history] = await Promise.all([
    buildSystemPrompt(supabase, user.id, timeZone),
    loadFullHistory(supabase, conversationId),
  ]);
  const { messages } = truncateToTokenBudget(
    history,
    DEFAULT_HISTORY_TOKEN_BUDGET,
  );

  const toolCtx = { supabase, userId: user.id, timeZone };
  const tools = {
    ...buildReadTools(toolCtx),
    ...buildMemoryTools(toolCtx),
    ...buildPlanTools(toolCtx),
  };
  const finalConversationId = conversationId;

  const result = streamText({
    model: agentModel(),
    system: systemPrompt,
    messages: await convertToModelMessages(messages, { tools }),
    tools,
    // The only tool that writes anything (writeWeekPlan) needs an explicit
    // user click before it runs; every read/memory tool executes freely.
    toolApproval: { writeWeekPlan: "user-approval" },
    // streamText defaults to a single step, which stops the loop right
    // after a tool call executes and never lets the model read the result
    // and reply — a real regression caught in live testing. Retro/Plan can
    // legitimately chain several read-tool calls before a final answer.
    stopWhen: stepCountIs(20),
    providerOptions: AGENT_PROVIDER_OPTIONS,
  });

  const uiStream = toUIMessageStream({
    stream: result.stream,
    originalMessages: [incomingMessage],
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
