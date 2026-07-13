"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Styled replacement for window.confirm: renders its own overlay dialog
 * and calls onConfirm when the destructive action is accepted.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onCancel}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-lg border border-hairline bg-panel p-5 shadow-2xl shadow-black/60"
      >
        <h2 className="text-sm font-semibold">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm break-words text-muted">{description}</p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} autoFocus>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-danger text-foreground hover:bg-danger/85"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Small hook pairing a trigger with the dialog state. */
export function useConfirm() {
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  return {
    open: pendingAction !== null,
    request(action: () => void) {
      setPendingAction(() => action);
    },
    confirm() {
      pendingAction?.();
      setPendingAction(null);
    },
    cancel() {
      setPendingAction(null);
    },
  };
}
