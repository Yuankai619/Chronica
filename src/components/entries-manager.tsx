"use client";

import { useState, useTransition } from "react";
import {
  confirmEntry,
  createEntry,
  deleteEntry,
  updateEntry,
} from "@/app/(app)/entries/actions";
import {
  formatDuration,
  groupEntriesByDay,
  type TimeEntry,
} from "@/lib/entries";
import type { Category } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TodoTask } from "@/lib/tasks";

type TaskPickerTasks = TodoTask[] | null | undefined;
import { TaskPicker } from "@/components/task-picker";
import { ConfirmDialog, useConfirm } from "@/components/ui/confirm-dialog";

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function EntryForm({
  categories,
  entry,
  tasks,
  onDone,
}: {
  categories: Category[];
  entry?: TimeEntry;
  tasks?: TodoTask[] | null;
  onDone?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    if ((formData.get("started_at") as string) === "") {
      formData.set("started_at", toLocalInputValue(new Date()));
    }
    // Convert the datetime-local value (which is in the client's local
    // timezone without offset) to an ISO string so the server receives
    // unambiguous UTC regardless of server timezone.
    const raw = formData.get("started_at") as string;
    if (raw) {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) {
        formData.set("started_at", d.toISOString());
      }
    }
    startTransition(async () => {
      const result = entry
        ? await updateEntry(entry.id, formData)
        : await createEntry(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        onDone?.();
      }
    });
  }

  return (
    <form action={submit} className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Select
          name="category_id"
          aria-label="Category"
          defaultValue={entry?.category_id}
          required
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.archived_at ? " (archived)" : ""}
            </option>
          ))}
        </Select>
        <Input
          name="duration"
          placeholder="Duration — 90 or 1:30"
          aria-label="Duration"
          defaultValue={entry ? String(entry.duration_minutes) : ""}
          className="sm:w-44"
          required
        />
      </div>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Input
          name="started_at"
          type="datetime-local"
          aria-label="Start time (defaults to now)"
          defaultValue={
            entry ? toLocalInputValue(new Date(entry.started_at)) : ""
          }
          className="cursor-pointer sm:w-56"
          onClick={(event) => event.currentTarget.showPicker?.()}
        />
        <Textarea
          name="note"
          placeholder="Note (optional)"
          defaultValue={entry?.note ?? ""}
          rows={1}
        />
      </div>
      {tasks && tasks.length > 0 ? (
        <div className="sm:max-w-96">
          <TaskPicker
            tasks={tasks}
            initial={
              entry?.todo_task_id
                ? (tasks.find((t) => t.id === entry.todo_task_id) ?? {
                    id: entry.todo_task_id,
                    title: entry.todo_task_title ?? "Linked task",
                    listId: entry.todo_list_id ?? "",
                    listTitle: "Linked",
                    dueDate: null,
                    description: null,
                  })
                : null
            }
          />
        </div>
      ) : null}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {entry ? "Save" : "Log it"}
        </Button>
        {onDone ? (
          <Button variant="ghost" type="button" onClick={onDone}>
            Cancel
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </form>
  );
}

function EntryRow({
  entry,
  categories,
  tasks,
}: {
  entry: TimeEntry;
  categories: Category[];
  tasks: TaskPickerTasks;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();
  const category = categories.find((c) => c.id === entry.category_id);
  const startedAt = new Date(entry.started_at);

  if (editing) {
    return (
      <li className="border-b border-hairline py-4">
        <EntryForm
          categories={categories}
          entry={entry}
          tasks={tasks}
          onDone={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="flex flex-col justify-between gap-2 border-b border-hairline py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-muted tabular-nums">
            {startedAt.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <span className="font-medium">
            {category?.name ?? "Unknown category"}
          </span>
          <span className="font-mono text-sm text-accent tabular-nums">
            {formatDuration(entry.duration_minutes)}
          </span>
          {entry.source === "timer" ? <Badge>timer</Badge> : null}
          {entry.needs_confirmation ? (
            <Badge variant="warning">needs confirmation</Badge>
          ) : null}
          {entry.todo_task_title ? (
            <Badge>{entry.todo_task_title}</Badge>
          ) : null}
        </div>
        {entry.note ? (
          <span className="text-sm text-muted">{entry.note}</span>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-1">
        {entry.needs_confirmation ? (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await confirmEntry(entry.id);
              })
            }
          >
            Confirm
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          Edit
        </Button>
        <Button
          variant="danger"
          size="sm"
          disabled={pending}
          onClick={() =>
            confirm.request(() =>
              startTransition(async () => {
                await deleteEntry(entry.id);
              }),
            )
          }
        >
          Delete
        </Button>
      </div>
      <ConfirmDialog
        open={confirm.open}
        title="Delete this entry?"
        description="The recorded time is removed from all statistics."
        onConfirm={confirm.confirm}
        onCancel={confirm.cancel}
      />
    </li>
  );
}

export function EntriesManager({
  categories,
  entries,
  tasks,
}: {
  categories: Category[];
  entries: TimeEntry[];
  tasks: TodoTask[] | null;
}) {
  const activeCategories = categories.filter((c) => c.archived_at === null);
  const days = groupEntriesByDay(entries);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardTitle>Quick add</CardTitle>
        <EntryForm categories={activeCategories} tasks={tasks} />
      </Card>
      {days.length === 0 ? (
        <p className="text-sm text-muted">
          No entries yet — run a timer or log one above.
        </p>
      ) : (
        days.map((group) => (
          <section key={group.day}>
            <div className="flex items-baseline justify-between">
              <h2 className="microlabel">{group.day}</h2>
              <span className="font-mono text-xs text-muted tabular-nums">
                {formatDuration(
                  group.entries.reduce((sum, e) => sum + e.duration_minutes, 0),
                )}
              </span>
            </div>
            <ul className="mt-1 flex flex-col">
              {group.entries.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  categories={categories}
                  tasks={tasks}
                />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
