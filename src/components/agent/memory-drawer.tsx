"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, useConfirm } from "@/components/ui/confirm-dialog";
import {
  deleteMemoryAction,
  updateMemoryContentAction,
} from "@/app/(app)/agent/actions";
import type { MemoryRow } from "@/server/agent/memories";

const KIND_LABEL: Record<MemoryRow["kind"], string> = {
  pattern: "Pattern",
  preference: "Preference",
  trend: "Trend",
  constraint: "Constraint",
};

function MemoryItem({
  memory,
  onChanged,
  onDeleted,
}: {
  memory: MemoryRow;
  onChanged: (content: string) => void;
  onDeleted: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(memory.content);
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();

  async function save() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === memory.content) {
      setEditing(false);
      return;
    }
    setSaving(true);
    await updateMemoryContentAction(
      memory.id,
      memory.kind,
      trimmed,
      memory.categoryId,
    );
    onChanged(trimmed);
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="rounded-md border border-hairline bg-panel/40 p-3">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="microlabel">{KIND_LABEL[memory.kind]}</span>
        <div className="ml-auto h-1 w-16 overflow-hidden rounded-full bg-hairline">
          <div
            className={cn(
              "h-full rounded-full bg-accent",
              memory.displayConfidence < 0.4 && "bg-muted",
            )}
            style={{ width: `${Math.round(memory.displayConfidence * 100)}%` }}
          />
        </div>
        <button
          type="button"
          aria-label="Edit"
          onClick={() => setEditing((v) => !v)}
          className="cursor-pointer rounded p-1 text-muted hover:text-foreground"
        >
          <Pencil className="size-3.5" aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Delete"
          onClick={() =>
            confirm.request(async () => {
              await deleteMemoryAction(memory.id);
              onDeleted();
              router.refresh();
            })
          }
          className="cursor-pointer rounded p-1 text-muted hover:text-danger"
        >
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      </div>

      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            className="text-sm"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDraft(memory.content);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
            <Button size="sm" disabled={saving} onClick={save}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-foreground/90">{memory.content}</p>
      )}

      <ConfirmDialog
        open={confirm.open}
        title="Delete this memory?"
        description="The agent won't recall this observation in future conversations."
        onConfirm={confirm.confirm}
        onCancel={confirm.cancel}
      />
    </div>
  );
}

export function MemoryDrawer({
  open,
  memories: initialMemories,
  onClose,
}: {
  open: boolean;
  memories: MemoryRow[];
  onClose: () => void;
}) {
  const [memories, setMemories] = useState(initialMemories);
  // The parent re-fetches memories after every agent turn and passes a
  // fresh array down; adjust local state during render (React's
  // documented pattern for this — not an effect, which would cause an
  // extra render pass) so newly-written memories show up without a page
  // refresh. Local edits/deletes below still apply via setMemories.
  const [syncedFrom, setSyncedFrom] = useState(initialMemories);
  if (initialMemories !== syncedFrom) {
    setSyncedFrom(initialMemories);
    setMemories(initialMemories);
  }

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
              <MemoryItem
                key={m.id}
                memory={m}
                onChanged={(content) =>
                  setMemories((prev) =>
                    prev.map((row) =>
                      row.id === m.id ? { ...row, content } : row,
                    ),
                  )
                }
                onDeleted={() =>
                  setMemories((prev) => prev.filter((row) => row.id !== m.id))
                }
              />
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
