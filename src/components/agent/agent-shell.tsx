"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat, type UseChatHelpers } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type UIMessage,
} from "ai";
import {
  Bot,
  Brain,
  CalendarClock,
  ClipboardList,
  Loader2,
  Menu,
  Send,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConversationList } from "@/components/agent/conversation-list";
import { MemoryDrawer } from "@/components/agent/memory-drawer";
import { MessageParts } from "@/components/agent/message-parts";
import { listMessagesAction } from "@/app/(app)/agent/actions";
import type {
  ConversationPage,
  MessagePage,
} from "@/server/agent/conversations";
import type { MemoryRow } from "@/server/agent/memories";

const SLASH_COMMANDS = [
  {
    cmd: "/retro",
    label: "Retro",
    hint: "Review a past week",
    icon: CalendarClock,
  },
  {
    cmd: "/plan",
    label: "Plan",
    hint: "Plan an upcoming week",
    icon: ClipboardList,
  },
];

function conversationIdFromMessages(messages: UIMessage[]): string | null {
  for (const message of messages) {
    const id = (message.metadata as { conversationId?: string } | undefined)
      ?.conversationId;
    if (id) return id;
  }
  return null;
}

function ChatMessage({
  message,
  onOpenMemory,
  onRespondApproval,
}: {
  message: UIMessage;
  onOpenMemory?: () => void;
  onRespondApproval?: (approvalId: string, approved: boolean) => void;
}) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-panel text-foreground" : "bg-accent/15 text-accent",
        )}
      >
        {isUser ? (
          <span className="text-xs font-semibold">You</span>
        ) : (
          <Bot className="size-3.5" aria-hidden />
        )}
      </div>
      <div
        className={cn(
          "min-w-0 max-w-[85%] space-y-1 rounded-lg px-3.5 py-2.5",
          isUser ? "bg-panel" : "bg-panel/40",
        )}
      >
        <MessageParts
          message={message}
          onOpenMemory={onOpenMemory}
          onRespondApproval={onRespondApproval}
        />
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex gap-3">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
        <Bot className="size-3.5" aria-hidden />
      </div>
      <div className="flex items-center gap-1.5 rounded-lg bg-panel/40 px-3.5 py-2.5">
        <span className="size-1.5 animate-pulse rounded-full bg-muted [animation-delay:-0.3s]" />
        <span className="size-1.5 animate-pulse rounded-full bg-muted [animation-delay:-0.15s]" />
        <span className="size-1.5 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}

export function AgentShell({
  configured,
  initialConversationId,
  initialConversations,
  initialMessages,
  initialMemories,
}: {
  configured: boolean;
  initialConversationId: string | null;
  initialConversations: ConversationPage;
  initialMessages: MessagePage | null;
  initialMemories: MemoryRow[];
}) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [olderCursor, setOlderCursor] = useState(
    initialMessages?.nextCursor ?? null,
  );
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [input, setInput] = useState("");

  const chat: UseChatHelpers<UIMessage> = useChat({
    id: initialConversationId ?? undefined,
    messages: initialMessages?.items ?? [],
    generateId: () => crypto.randomUUID(),
    // Approve/reject a plan resubmits automatically instead of needing
    // another Enter press.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    transport: new DefaultChatTransport({
      api: "/api/agent/chat",
      prepareSendMessagesRequest: ({ messages: allMessages }) => ({
        body: {
          conversationId:
            initialConversationId ?? conversationIdFromMessages(allMessages),
          message: allMessages.at(-1),
        },
      }),
    }),
  });

  // A brand-new conversation only gets its id once the first response's
  // metadata carries it back — derive it from the messages themselves
  // instead of duplicating it into state.
  const conversationId =
    initialConversationId ?? conversationIdFromMessages(chat.messages);

  // Sync the URL (an external system) once that id shows up AND the turn
  // has actually finished streaming. Navigating remounts this component
  // (it's keyed by conversation id in the parent Server Component) and
  // refetches initialMessages from the DB — if we navigated the instant
  // the id arrived (mid-stream, before onEnd's save resolves), the remount
  // would replace the live client message with whatever had persisted so
  // far, which could be nothing. Waiting for "ready" avoids that race.
  useEffect(() => {
    if (!initialConversationId && conversationId && chat.status === "ready") {
      router.replace(`/agent?c=${conversationId}`, { scroll: false });
    }
  }, [initialConversationId, conversationId, chat.status, router]);

  async function loadOlder() {
    if (!olderCursor || !conversationId) return;
    setLoadingOlder(true);
    const page = await listMessagesAction(conversationId, olderCursor);
    chat.setMessages((prev) => [...page.items, ...prev]);
    setOlderCursor(page.nextCursor);
    setLoadingOlder(false);
  }

  function submit() {
    const text = input.trim();
    if (!text || chat.status === "streaming" || chat.status === "submitted")
      return;
    setInput("");
    chat.sendMessage({ text });
  }

  function selectSlashCommand(cmd: string) {
    setInput(`${cmd} `);
    textareaRef.current?.focus();
  }

  const busy = chat.status === "streaming" || chat.status === "submitted";
  const lastMessage = chat.messages.at(-1);
  const lastAssistantHasText =
    lastMessage?.role === "assistant" &&
    lastMessage.parts.some(
      (p) => p.type === "text" && p.text.trim().length > 0,
    );
  const showThinking = busy && !lastAssistantHasText;

  const slashMatches =
    input.startsWith("/") && !input.includes(" ")
      ? SLASH_COMMANDS.filter((c) => c.cmd.startsWith(input))
      : [];

  return (
    <div className="-mx-4 flex h-[calc(100vh-6.5rem)] gap-4 sm:-mx-6 lg:-mx-10 lg:h-[calc(100vh-5rem)]">
      {/* Desktop conversation list */}
      <div className="hidden w-64 shrink-0 rounded-lg border border-hairline bg-panel/30 p-3 lg:block">
        <ConversationList
          activeConversationId={initialConversationId}
          initialItems={initialConversations.items}
          initialCursor={initialConversations.nextCursor}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col rounded-lg border border-hairline bg-panel/20">
        <header className="flex items-center gap-2 border-b border-hairline px-4 py-3">
          <button
            type="button"
            onClick={() => setListOpen(true)}
            aria-label="Conversations"
            className="cursor-pointer rounded-md p-1.5 text-muted hover:bg-panel hover:text-foreground lg:hidden"
          >
            <Menu className="size-4" aria-hidden />
          </button>
          <h1 className="text-sm font-semibold">AI Agent</h1>
          <button
            type="button"
            onClick={() => setMemoryOpen(true)}
            aria-label="Memory"
            className="ml-auto flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted hover:bg-panel hover:text-foreground"
          >
            <Brain className="size-4" aria-hidden />
            Memory
          </button>
        </header>

        {!configured ? (
          <div className="mx-4 mt-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            OPENAI_API_KEY is not configured on the server — the agent
            can&apos;t respond yet.
          </div>
        ) : null}

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {olderCursor ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={loadOlder}
                disabled={loadingOlder}
                className="cursor-pointer rounded-md px-3 py-1.5 text-xs text-muted hover:bg-panel hover:text-foreground disabled:opacity-50"
              >
                {loadingOlder ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  "Load earlier messages"
                )}
              </button>
            </div>
          ) : null}

          {chat.messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center text-muted">
              <Bot className="size-8" aria-hidden />
              <p className="text-sm">
                Ask about your time, or type{" "}
                <span className="font-mono text-foreground/80">/retro</span> or{" "}
                <span className="font-mono text-foreground/80">/plan</span>.
              </p>
            </div>
          ) : (
            chat.messages.map((m) => (
              <ChatMessage
                key={m.id}
                message={m}
                onOpenMemory={() => setMemoryOpen(true)}
                onRespondApproval={(approvalId, approved) =>
                  chat.addToolApprovalResponse({ id: approvalId, approved })
                }
              />
            ))
          )}
          {showThinking ? <ThinkingBubble /> : null}
        </div>

        <div className="relative border-t border-hairline p-3">
          {slashMatches.length > 0 ? (
            <div className="absolute inset-x-3 bottom-full mb-2 overflow-hidden rounded-md border border-hairline bg-panel shadow-xl shadow-black/40">
              {slashMatches.map((c) => (
                <button
                  key={c.cmd}
                  type="button"
                  onClick={() => selectSlashCommand(c.cmd)}
                  className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-sm text-foreground/90 hover:bg-panel/60"
                >
                  <c.icon
                    className="size-3.5 shrink-0 text-accent"
                    aria-hidden
                  />
                  <span className="font-mono">{c.cmd}</span>
                  <span className="text-xs text-muted">{c.hint}</span>
                </button>
              ))}
            </div>
          ) : null}
          <div className="flex items-end gap-2 rounded-md border border-hairline bg-panel px-3 py-2 focus-within:border-muted">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (slashMatches.length > 0) {
                    selectSlashCommand(slashMatches[0].cmd);
                  } else {
                    submit();
                  }
                }
              }}
              rows={1}
              placeholder="Ask about your time, or /retro, /plan…"
              disabled={!configured}
              className="max-h-40 flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted/70 focus:outline-none disabled:opacity-50"
            />
            <button
              type="button"
              onClick={submit}
              disabled={!configured || !input.trim() || busy}
              aria-label="Send"
              className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md bg-accent text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Send className="size-3.5" aria-hidden />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile conversation list sheet */}
      {listOpen ? (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setListOpen(false)}
            role="presentation"
          />
          <div className="relative flex h-full w-full max-w-xs flex-col bg-background p-4">
            <button
              type="button"
              onClick={() => setListOpen(false)}
              aria-label="Close"
              className="absolute top-3 right-3 cursor-pointer rounded-md p-1.5 text-muted hover:text-foreground"
            >
              <X className="size-4" aria-hidden />
            </button>
            <ConversationList
              activeConversationId={initialConversationId}
              initialItems={initialConversations.items}
              initialCursor={initialConversations.nextCursor}
              onNavigate={() => setListOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <MemoryDrawer
        open={memoryOpen}
        memories={initialMemories}
        onClose={() => setMemoryOpen(false)}
      />
    </div>
  );
}
