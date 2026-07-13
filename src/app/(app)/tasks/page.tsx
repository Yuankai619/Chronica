import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDuration } from "@/lib/entries";
import { isUrlTitle, dueDateKey } from "@/lib/tasks";
import { dayKey } from "@/lib/unrecorded";
import { getOpenTasks } from "@/server/microsoft";
import { Card } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import { TaskCompleteCheckbox } from "@/components/task-complete-checkbox";
import { cn } from "@/lib/utils";

export const metadata = { title: "Tasks — Chronica" };

interface TaskCost {
  id: string;
  title: string;
  listId: string | null;
  totalMinutes: number;
  entryCount: number;
  lastActivity: string;
}

function TaskTitle({ title }: { title: string }) {
  if (isUrlTitle(title)) {
    return (
      <a
        href={title}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-[#7cc0f5] underline-offset-2 hover:underline"
      >
        {title.replace(/^https?:\/\//, "")}
        <ExternalLink className="size-3" aria-hidden />
      </a>
    );
  }
  return <>{title}</>;
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const showCompleted = tab === "completed";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Completed-today rows expire after the day passes: purge, then read.
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  await supabase
    .from("completed_tasks")
    .delete()
    .lt("completed_at", todayStart.toISOString());

  const today = dayKey(new Date());

  const [{ data: entries }, { data: completed }, allTasks] = await Promise.all([
    supabase
      .from("time_entries")
      .select(
        "todo_task_id, todo_task_title, todo_list_id, duration_minutes, started_at",
      )
      .not("todo_task_id", "is", null)
      .order("started_at", { ascending: false })
      .limit(2000),
    supabase
      .from("completed_tasks")
      .select("*")
      .order("completed_at", { ascending: false }),
    user ? getOpenTasks(supabase, user.id) : Promise.resolve(null),
  ]);

  const completedIds = new Set((completed ?? []).map((c) => c.task_id));

  // Build task-cost map from time entries (existing logic).
  const tasks = new Map<string, TaskCost>();
  for (const entry of entries ?? []) {
    const id = entry.todo_task_id!;
    const existing = tasks.get(id);
    if (existing) {
      existing.totalMinutes += entry.duration_minutes;
      existing.entryCount += 1;
      existing.listId ??= entry.todo_list_id;
    } else {
      tasks.set(id, {
        id,
        title: entry.todo_task_title ?? "Untitled task",
        listId: entry.todo_list_id,
        totalMinutes: entry.duration_minutes,
        entryCount: 1,
        lastActivity: entry.started_at,
      });
    }
  }

  // Add tasks due today that don't already have time entries.
  const dueTodayTasks = (allTasks ?? []).filter(
    (t) => dueDateKey(t.dueDate) === today,
  );
  for (const t of dueTodayTasks) {
    if (tasks.has(t.id)) continue;
    tasks.set(t.id, {
      id: t.id,
      title: t.title,
      listId: t.listId,
      totalMinutes: 0,
      entryCount: 0,
      lastActivity: "",
    });
  }

  const rows = [...tasks.values()]
    .filter((t) => !completedIds.has(t.id))
    .filter((t) => {
      // In the Open tab: show tasks with time entries OR due today.
      if (showCompleted) return true;
      const isDueToday = dueTodayTasks.some((d) => d.id === t.id);
      return t.entryCount > 0 || isDueToday;
    })
    .toSorted((a, b) => {
      // Due-today tasks with no time entries go to the bottom.
      const aLinked = a.entryCount > 0;
      const bLinked = b.entryCount > 0;
      if (aLinked !== bLinked) return aLinked ? -1 : 1;
      return b.totalMinutes - a.totalMinutes;
    });

  return (
    <main>
      <h1 className="mb-2 text-xl font-semibold">Task time costs</h1>
      <p className="mb-5 text-sm text-muted">
        Tasks due today and tasks with tracked time. Only tasks with time
        entries can be checked off — others are read-only.
      </p>

      <div className="mb-6 flex gap-1 border-b border-hairline">
        {[
          { href: "/tasks", label: "Open", active: !showCompleted },
          {
            href: "/tasks?tab=completed",
            label: `Completed today${completed && completed.length > 0 ? ` (${completed.length})` : ""}`,
            active: showCompleted,
          },
        ].map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
              t.active
                ? "border-accent text-foreground"
                : "border-transparent text-muted hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {showCompleted ? (
        (completed ?? []).length === 0 ? (
          <Card>
            <p className="text-sm text-muted">
              Nothing completed today. Completed tasks clear automatically after
              the day ends.
            </p>
          </Card>
        ) : (
          <ul className="flex flex-col">
            {(completed ?? []).map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between gap-3 border-b border-hairline py-3"
              >
                <span className="font-medium line-through decoration-muted/60">
                  <TaskTitle title={task.title} />
                </span>
                <span className="font-mono text-xs text-muted tabular-nums">
                  {new Date(task.completed_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )
      ) : rows.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            No task-linked entries yet. Link a Microsoft account in Settings,
            then attach a task when starting a timer or logging time.
          </p>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left">
                <th className="microlabel py-2 font-normal">Done</th>
                <th className="microlabel py-2 font-normal">Task</th>
                <th className="microlabel py-2 text-right font-normal">
                  Total time
                </th>
                <th className="microlabel py-2 text-right font-normal">
                  Entries
                </th>
                <th className="microlabel py-2 text-right font-normal">
                  Last activity
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((task) => {
                const isLinked = task.entryCount > 0;
                return (
                  <tr
                    key={task.id}
                    className={cn(
                      "border-b border-hairline",
                      !isLinked && "opacity-70",
                    )}
                  >
                    <td className="py-2.5 pr-2">
                      <TaskCompleteCheckbox
                        taskId={task.id}
                        listId={task.listId}
                        title={task.title}
                        disabled={!isLinked}
                      />
                    </td>
                    <td className="py-2.5 pr-3 font-medium">
                      <TaskTitle title={task.title} />
                      {!isLinked ? (
                        <span className="ml-2 text-[0.65rem] tracking-wider text-muted uppercase">
                          due today
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2.5 text-right font-mono text-accent tabular-nums">
                      {isLinked ? formatDuration(task.totalMinutes) : "—"}
                    </td>
                    <td className="py-2.5 text-right font-mono text-muted tabular-nums">
                      {isLinked ? task.entryCount : "—"}
                    </td>
                    <td className="py-2.5 text-right font-mono text-muted tabular-nums">
                      {isLinked && task.lastActivity
                        ? new Date(task.lastActivity).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
