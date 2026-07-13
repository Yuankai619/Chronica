"use client";

import { useState, useTransition } from "react";
import { completeTask } from "@/app/(app)/tasks/actions";

/** Checkbox that completes a task and syncs the status to Microsoft. */
export function TaskCompleteCheckbox({
  taskId,
  listId,
  title,
  disabled = false,
}: {
  taskId: string;
  listId: string | null;
  title: string;
  disabled?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (disabled || listId === null) {
    return (
      <input
        type="checkbox"
        disabled
        aria-label={
          disabled
            ? "Cannot complete — no time entries linked"
            : "Cannot complete — entry predates list tracking"
        }
        className="size-4 opacity-30"
      />
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <input
        type="checkbox"
        disabled={pending}
        aria-label={`Mark "${title}" completed`}
        className="size-4 cursor-pointer accent-[#f0b429]"
        onChange={(event) => {
          if (!event.target.checked) return;
          startTransition(async () => {
            const result = await completeTask(taskId, listId, title);
            setError(result.error ?? null);
          });
        }}
      />
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </span>
  );
}
