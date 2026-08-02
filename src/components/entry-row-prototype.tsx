"use client";

/**
 * PROTOTYPE ONLY — throwaway layout variants for #63. Delete once a
 * variant wins; the winner gets rewritten properly inside EntryRow.
 *
 * Question: how should an entry row show its start–end range and total?
 * Three structurally different answers, switchable via `?variant=`.
 *
 * End time is computed (started_at + duration_minutes); nothing is stored.
 */

import type { ReactNode } from "react";
import type { TimeEntry } from "@/lib/entries";
import { formatDuration } from "@/lib/entries";
import type { Category } from "@/lib/categories";
import { dayKeyInTz } from "@/lib/tz";
import { Badge } from "@/components/ui/badge";

export const VARIANTS = ["A", "B", "C"] as const;
export const VARIANT_LABELS: Record<string, string> = {
  A: "Timeline rail",
  B: "Content first",
  C: "Duration led",
};

function endOf(entry: TimeEntry): Date {
  return new Date(
    Date.parse(entry.started_at) + entry.duration_minutes * 60_000,
  );
}

function hhmm(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/** Whole days the end time lands past the start day, in the user's zone. */
function dayOffset(entry: TimeEntry, timeZone: string): number {
  const start = dayKeyInTz(new Date(entry.started_at), timeZone);
  const end = dayKeyInTz(endOf(entry), timeZone);
  if (start === end) return 0;
  return Math.round(
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
      86_400_000,
  );
}

interface RowProps {
  entry: TimeEntry;
  category: Category | undefined;
  timeZone: string;
  actions: ReactNode;
}

function Meta({ entry }: { entry: TimeEntry }) {
  return (
    <>
      {entry.source === "timer" ? <Badge>timer</Badge> : null}
      {entry.needs_confirmation ? (
        <Badge variant="warning">needs confirmation</Badge>
      ) : null}
      {entry.todo_task_title ? <Badge>{entry.todo_task_title}</Badge> : null}
    </>
  );
}

/**
 * A — Timeline rail. A fixed-width mono range column on the left so every
 * row in a day lines up vertically; content flows to its right.
 */
function VariantA({ entry, category, timeZone, actions }: RowProps) {
  const start = new Date(entry.started_at);
  const end = endOf(entry);
  const offset = dayOffset(entry, timeZone);

  return (
    <li className="flex flex-col gap-1.5 border-b border-hairline py-3 sm:flex-row sm:items-start sm:gap-4">
      <span className="shrink-0 font-mono text-sm text-muted tabular-nums sm:w-32">
        {hhmm(start, timeZone)}–{hhmm(end, timeZone)}
        {offset > 0 ? (
          <sup className="ml-0.5 text-[10px] text-accent">+{offset}</sup>
        ) : null}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">
            {category?.name ?? "Unknown category"}
          </span>
          <span className="font-mono text-sm text-accent tabular-nums">
            {formatDuration(entry.duration_minutes)}
          </span>
          <Meta entry={entry} />
        </div>
        {entry.note ? (
          <span className="truncate text-sm text-muted">{entry.note}</span>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-1">{actions}</div>
    </li>
  );
}

/**
 * B — Content first. What you did is the headline; the time range and
 * total drop to a muted second line. Note is never truncated.
 */
function VariantB({ entry, category, timeZone, actions }: RowProps) {
  const start = new Date(entry.started_at);
  const end = endOf(entry);
  const offset = dayOffset(entry, timeZone);

  return (
    <li className="flex flex-col gap-1 border-b border-hairline py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">
            {category?.name ?? "Unknown category"}
          </span>
          <Meta entry={entry} />
        </div>
        {entry.note ? (
          <span className="text-sm text-muted">{entry.note}</span>
        ) : null}
        <span className="font-mono text-xs text-muted tabular-nums">
          {hhmm(start, timeZone)} → {hhmm(end, timeZone)}
          {offset > 0 ? ` (next day)` : ""}
          <span className="mx-1.5 text-hairline">·</span>
          <span className="text-accent">
            {formatDuration(entry.duration_minutes)}
          </span>
        </span>
      </div>
      <div className="flex shrink-0 gap-1">{actions}</div>
    </li>
  );
}

/**
 * C — Duration led. A left rail where the total is the biggest thing on
 * the row and the range sits stacked underneath it.
 */
function VariantC({ entry, category, timeZone, actions }: RowProps) {
  const start = new Date(entry.started_at);
  const end = endOf(entry);
  const offset = dayOffset(entry, timeZone);

  return (
    <li className="flex items-start gap-3 border-b border-hairline py-3 sm:gap-4">
      <div className="flex w-20 shrink-0 flex-col items-end sm:w-24">
        <span className="font-mono text-lg leading-tight font-semibold text-accent tabular-nums">
          {formatDuration(entry.duration_minutes)}
        </span>
        <span className="font-mono text-[11px] leading-tight text-muted tabular-nums">
          {hhmm(start, timeZone)}
        </span>
        <span className="font-mono text-[11px] leading-tight text-muted tabular-nums">
          {hhmm(end, timeZone)}
          {offset > 0 ? (
            <span className="ml-0.5 text-accent">+{offset}</span>
          ) : null}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 border-l border-hairline pl-3 sm:pl-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">
            {category?.name ?? "Unknown category"}
          </span>
          <Meta entry={entry} />
        </div>
        {entry.note ? (
          <span className="line-clamp-2 text-sm text-muted">{entry.note}</span>
        ) : null}
        <div className="mt-1 flex gap-1 sm:hidden">{actions}</div>
      </div>
      <div className="hidden shrink-0 gap-1 sm:flex">{actions}</div>
    </li>
  );
}

export function EntryRowVariant({
  variant,
  ...props
}: RowProps & { variant: string }) {
  if (variant === "B") return <VariantB {...props} />;
  if (variant === "C") return <VariantC {...props} />;
  return <VariantA {...props} />;
}
