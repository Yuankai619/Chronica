"use client";

import { useState, useTransition } from "react";
import { Copy } from "lucide-react";
import { copyLastWeekPlan } from "@/app/(app)/planning/actions";
import { Button } from "@/components/ui/button";

export function CopyWeekButton({ weekKey }: { weekKey: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function copy() {
    startTransition(async () => {
      const result = await copyLastWeekPlan(weekKey);
      if (result.error) {
        setError(result.error);
        setMessage(null);
      } else {
        setError(null);
        setMessage(
          result.copied === 0
            ? "No manual items last week"
            : `${result.copied} item${result.copied === 1 ? "" : "s"} copied`,
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
      <Button variant="outline" size="sm" disabled={pending} onClick={copy}>
        <Copy
          className={`size-3.5 ${pending ? "animate-pulse" : ""}`}
          aria-hidden
        />
        {pending ? "Copying…" : "Copy last week"}
      </Button>
    </span>
  );
}
