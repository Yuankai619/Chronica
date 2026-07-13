"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { refreshCalendarSync } from "@/app/(app)/planning/actions";
import { Button } from "@/components/ui/button";

export function CalendarSyncButton({ weekKey }: { weekKey: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function sync() {
    startTransition(async () => {
      const result = await refreshCalendarSync(weekKey);
      if (result.error) {
        setError(result.error);
        setMessage(null);
      } else {
        setError(null);
        setMessage(
          `${result.added ?? 0} added · ${result.updated ?? 0} updated · ${result.removed ?? 0} removed`,
        );
      }
    });
  }

  return (
    <span className="flex items-center gap-2">
      {message ? (
        <span className="font-mono text-xs text-muted tabular-nums">
          {message}
        </span>
      ) : null}
      {error ? <span className="text-xs text-danger">{error}</span> : null}
      <Button variant="outline" size="sm" disabled={pending} onClick={sync}>
        <RefreshCw
          className={`size-3.5 ${pending ? "animate-spin" : ""}`}
          aria-hidden
        />
        {pending ? "Syncing…" : "Refresh calendar sync"}
      </Button>
    </span>
  );
}
