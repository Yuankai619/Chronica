"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";

export function RetroCard({
  reviewWeekKey,
  initialContent,
  disabled = false,
}: {
  reviewWeekKey: string;
  initialContent: string | null;
  disabled?: boolean;
}) {
  const [content, setContent] = useState(initialContent);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    setError(null);
    try {
      const response = await fetch("/api/retro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week: reviewWeekKey }),
      });
      const data = (await response.json()) as {
        content?: string;
        error?: string;
      };
      if (!response.ok || data.error) {
        setError(data.error ?? `Request failed (${response.status})`);
      } else {
        setContent(data.content ?? null);
      }
    } catch {
      setError("Network error — try again.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle className="mb-0">
          AI retro · week of {reviewWeekKey}
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          disabled={running || disabled}
          onClick={run}
        >
          {running ? "Analyzing…" : content ? "Re-run" : "Run AI retro"}
        </Button>
      </div>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      {content ? (
        <pre className="mt-4 font-sans text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
          {content}
        </pre>
      ) : (
        <p className="mt-3 text-sm text-muted">
          {disabled
            ? "Last week has no recorded entries — the retro needs data to review."
            : "Reviews last week against your plan, real pace, and principles. Manual only — nothing runs automatically."}
        </p>
      )}
    </Card>
  );
}
