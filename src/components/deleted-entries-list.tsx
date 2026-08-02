"use client";

import { useTransition } from "react";
import { restoreEntry } from "@/app/(app)/entries/actions";
import { deletedDaysLeft, formatDuration, type TimeEntry } from "@/lib/entries";
import type { Category } from "@/lib/categories";
import { Badge, CategoryBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function daysLeftLabel(deletedAt: string, now: Date): string {
  const left = deletedDaysLeft(deletedAt, now);
  return left <= 1 ? "Last day" : `${left} days left`;
}

function DeletedRow({
  entry,
  category,
  timeZone,
  now,
}: {
  entry: TimeEntry;
  category: Category | undefined;
  timeZone: string;
  now: Date;
}) {
  const [pending, startTransition] = useTransition();
  const startedAt = new Date(entry.started_at);

  return (
    <li className="flex flex-col gap-2 border-b border-hairline py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-muted tabular-nums">
            {new Intl.DateTimeFormat("en-CA", {
              timeZone,
              dateStyle: "short",
              timeStyle: "short",
              hour12: false,
            }).format(startedAt)}
          </span>
          {category ? (
            <CategoryBadge
              id={category.id}
              name={`${category.name}${category.archived_at ? " (archived)" : ""}`}
              color={category.color}
            />
          ) : null}
          <span className="font-mono text-sm text-accent tabular-nums">
            {formatDuration(entry.duration_minutes)}
          </span>
          {entry.todo_task_title ? (
            <Badge>{entry.todo_task_title}</Badge>
          ) : null}
        </div>
        {entry.note ? (
          <span className="text-sm text-muted">{entry.note}</span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-3 sm:ml-auto">
        <span
          className="font-mono text-xs text-muted tabular-nums"
          title={`Deleted ${entry.deleted_at}`}
        >
          {/* Non-null: the page only queries rows where deleted_at is set. */}
          {daysLeftLabel(entry.deleted_at!, now)}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await restoreEntry(entry.id);
            })
          }
        >
          Restore
        </Button>
      </div>
    </li>
  );
}

export function DeletedEntriesList({
  entries,
  categories,
  timeZone,
  nowIso,
}: {
  entries: TimeEntry[];
  categories: Category[];
  timeZone: string;
  /** Pinned on the server so SSR and hydration agree across a day boundary. */
  nowIso: string;
}) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const now = new Date(nowIso);

  return (
    <ul className="flex flex-col">
      {entries.map((entry) => (
        <DeletedRow
          key={entry.id}
          entry={entry}
          category={categoryById.get(entry.category_id)}
          timeZone={timeZone}
          now={now}
        />
      ))}
    </ul>
  );
}
