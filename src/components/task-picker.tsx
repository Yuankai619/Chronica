"use client";

import { useState } from "react";
import { Check, ChevronDown, ExternalLink, X } from "lucide-react";
import {
  dueDateKey,
  encodeTaskOption,
  groupTasksByList,
  isUrlTitle,
  type TodoTask,
} from "@/lib/tasks";
import { cn } from "@/lib/utils";

function dayKeyToday(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function TaskTitle({
  title,
  className,
}: {
  title: string;
  className?: string;
}) {
  if (isUrlTitle(title)) {
    return (
      <a
        href={title}
        target="_blank"
        rel="noreferrer"
        onClick={(event) => event.stopPropagation()}
        className={cn(
          "inline-flex min-w-0 items-center gap-1 text-[#7cc0f5] underline-offset-2 hover:underline",
          className,
        )}
      >
        <span className="truncate">{title.replace(/^https?:\/\//, "")}</span>
        <ExternalLink className="size-3 shrink-0" aria-hidden />
      </a>
    );
  }
  return <span className={cn("truncate", className)}>{title}</span>;
}

function DueBadge({ dueDate }: { dueDate: string | null }) {
  const due = dueDateKey(dueDate);
  if (!due) return null;
  const overdue = due < dayKeyToday();
  return (
    <span
      className={cn(
        "shrink-0 font-mono text-xs tabular-nums",
        overdue ? "text-danger" : "text-muted",
      )}
    >
      {due}
    </span>
  );
}

/**
 * Grouped To Do task picker: tasks are shown under their list name with
 * due dates; URL-only titles render as external links. Submits the
 * selected task via a hidden `name` input (same contract as before).
 */
export function TaskPicker({
  tasks,
  name = "task",
}: {
  tasks: TodoTask[];
  name?: string;
}) {
  const [selected, setSelected] = useState<TodoTask | null>(null);
  const [open, setOpen] = useState(false);
  const groups = groupTasksByList(tasks);

  return (
    <div className="relative">
      <input
        type="hidden"
        name={name}
        value={selected ? encodeTaskOption(selected) : ""}
      />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-hairline bg-panel px-3 text-sm hover:border-muted focus:border-muted focus:outline-none"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected ? (
          <span className="flex min-w-0 items-center gap-2">
            <TaskTitle title={selected.title} className="max-w-56" />
            <DueBadge dueDate={selected.dueDate} />
          </span>
        ) : (
          <span className="text-muted/70">Attach a To Do task (optional)</span>
        )}
        <span className="flex shrink-0 items-center gap-1">
          {selected ? (
            <X
              className="size-4 text-muted hover:text-foreground"
              aria-label="Clear task"
              onClick={(event) => {
                event.stopPropagation();
                setSelected(null);
                setOpen(false);
              }}
            />
          ) : null}
          <ChevronDown className="size-4 text-muted" aria-hidden />
        </span>
      </button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="listbox"
            className="absolute z-40 mt-1 max-h-72 w-full min-w-64 overflow-y-auto rounded-md border border-hairline bg-panel shadow-xl shadow-black/40"
          >
            {groups.map((group) => (
              <div key={group.list} className="py-1">
                <p className="microlabel px-3 pt-2 pb-1">{group.list}</p>
                {group.tasks.map((task) => {
                  const active = selected?.id === task.id;
                  return (
                    <div
                      key={task.id}
                      role="option"
                      aria-selected={active}
                      tabIndex={0}
                      onClick={() => {
                        setSelected(task);
                        setOpen(false);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          setSelected(task);
                          setOpen(false);
                        }
                      }}
                      className={cn(
                        "flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-background/60",
                        active && "bg-background/60",
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Check
                          className={cn(
                            "size-3.5 shrink-0 text-accent",
                            active ? "opacity-100" : "opacity-0",
                          )}
                          aria-hidden
                        />
                        <TaskTitle title={task.title} />
                      </span>
                      <DueBadge dueDate={task.dueDate} />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
