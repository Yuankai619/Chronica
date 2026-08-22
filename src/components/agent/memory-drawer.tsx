"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MemoryRow } from "@/server/agent/memories";

const KIND_LABEL: Record<MemoryRow["kind"], string> = {
  pattern: "Pattern",
  preference: "Preference",
  trend: "Trend",
  constraint: "Constraint",
};

export function MemoryDrawer({
  open,
  memories,
  onClose,
}: {
  open: boolean;
  memories: MemoryRow[];
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={onClose}
        role="presentation"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Agent memory"
        className="relative flex h-full w-full max-w-sm flex-col border-l border-hairline bg-background p-5 shadow-2xl shadow-black/60"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Memory</h2>
            <p className="mt-0.5 text-xs text-muted">
              What the agent has learned about your habits.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-md p-1.5 text-muted hover:bg-panel hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto">
          {memories.length === 0 ? (
            <p className="mt-6 text-center text-sm text-muted">
              No memories yet — they build up as you run Retro and Plan.
            </p>
          ) : (
            memories.map((m) => (
              <div
                key={m.id}
                className="rounded-md border border-hairline bg-panel/40 p-3"
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="microlabel">{KIND_LABEL[m.kind]}</span>
                  <div className="ml-auto h-1 w-16 overflow-hidden rounded-full bg-hairline">
                    <div
                      className={cn(
                        "h-full rounded-full bg-accent",
                        m.confidence < 0.4 && "bg-muted",
                      )}
                      style={{ width: `${Math.round(m.confidence * 100)}%` }}
                    />
                  </div>
                </div>
                <p className="text-sm text-foreground/90">{m.content}</p>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
