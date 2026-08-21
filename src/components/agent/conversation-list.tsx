"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquarePlus, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, useConfirm } from "@/components/ui/confirm-dialog";
import {
  deleteConversationAction,
  listConversationsAction,
} from "@/app/(app)/agent/actions";
import type { ConversationSummary } from "@/server/agent/conversations";

function relativeDay(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function ConversationList({
  activeConversationId,
  initialItems,
  initialCursor,
  onNavigate,
}: {
  activeConversationId: string | null;
  initialItems: ConversationSummary[];
  initialCursor: string | null;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, startLoading] = useTransition();
  const confirm = useConfirm();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  function loadMore() {
    startLoading(async () => {
      const page = await listConversationsAction(cursor);
      setItems((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    });
  }

  function requestDelete(id: string) {
    setPendingDeleteId(id);
    confirm.request(async () => {
      setItems((prev) => prev.filter((c) => c.id !== id));
      await deleteConversationAction(id);
      if (id === activeConversationId) router.push("/agent");
      else router.refresh();
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-1 pb-3">
        <p className="microlabel">Conversations</p>
        <Link
          href="/agent"
          onClick={onNavigate}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-panel hover:text-foreground"
        >
          <MessageSquarePlus className="size-3.5" aria-hidden />
          New
        </Link>
      </div>

      <div className="flex-1 space-y-0.5 overflow-y-auto">
        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted">
            No conversations yet.
          </p>
        ) : null}
        {items.map((c) => {
          const active = c.id === activeConversationId;
          return (
            <div key={c.id} className="group relative">
              <Link
                href={`/agent?c=${c.id}`}
                onClick={onNavigate}
                className={cn(
                  "block truncate rounded-md py-2 pr-8 pl-2.5 text-sm transition-colors",
                  active
                    ? "bg-panel text-foreground shadow-[inset_2px_0_0_0_var(--color-accent)]"
                    : "text-muted hover:bg-panel/60 hover:text-foreground",
                )}
              >
                <span className="block truncate">{c.title}</span>
                <span className="block truncate font-mono text-[0.65rem] text-muted/70">
                  {relativeDay(c.lastMessageAt)}
                </span>
              </Link>
              <button
                type="button"
                aria-label={`Delete "${c.title}"`}
                onClick={() => requestDelete(c.id)}
                className="absolute top-1/2 right-1 -translate-y-1/2 cursor-pointer rounded-md p-1.5 text-muted opacity-0 transition-opacity hover:text-danger group-hover:opacity-100 focus-visible:opacity-100"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>

      {cursor ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={loading}
          onClick={loadMore}
          className="mt-2 w-full justify-center"
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            "Load more"
          )}
        </Button>
      ) : null}

      <ConfirmDialog
        open={confirm.open}
        title="Delete this conversation?"
        description={
          pendingDeleteId
            ? "This permanently deletes the conversation and its messages. Memories the agent learned from it are kept."
            : undefined
        }
        onConfirm={confirm.confirm}
        onCancel={confirm.cancel}
      />
    </div>
  );
}
