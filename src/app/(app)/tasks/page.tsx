import { createClient } from "@/lib/supabase/server";
import { formatDuration } from "@/lib/entries";
import { Card } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import { isUrlTitle } from "@/lib/tasks";

export const metadata = { title: "Tasks — Chronica" };

interface TaskCost {
  id: string;
  title: string;
  totalMinutes: number;
  entryCount: number;
  lastActivity: string;
}

export default async function TasksPage() {
  const supabase = await createClient();

  const { data: entries } = await supabase
    .from("time_entries")
    .select("todo_task_id, todo_task_title, duration_minutes, started_at")
    .not("todo_task_id", "is", null)
    .order("started_at", { ascending: false })
    .limit(2000);

  const tasks = new Map<string, TaskCost>();
  for (const entry of entries ?? []) {
    const id = entry.todo_task_id!;
    const existing = tasks.get(id);
    if (existing) {
      existing.totalMinutes += entry.duration_minutes;
      existing.entryCount += 1;
    } else {
      tasks.set(id, {
        id,
        title: entry.todo_task_title ?? "Untitled task",
        totalMinutes: entry.duration_minutes,
        entryCount: 1,
        lastActivity: entry.started_at,
      });
    }
  }

  const rows = [...tasks.values()].toSorted(
    (a, b) => b.totalMinutes - a.totalMinutes,
  );

  return (
    <main>
      <h1 className="mb-2 text-xl font-semibold">Task time costs</h1>
      <p className="mb-6 text-sm text-muted">
        Cumulative time per attached To Do task, across all entries and days.
      </p>
      {rows.length === 0 ? (
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
              {rows.map((task) => (
                <tr key={task.id} className="border-b border-hairline">
                  <td className="py-2.5 pr-3 font-medium">
                    {isUrlTitle(task.title) ? (
                      <a
                        href={task.title}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#7cc0f5] underline-offset-2 hover:underline"
                      >
                        {task.title.replace(/^https?:\/\//, "")}
                        <ExternalLink className="size-3" aria-hidden />
                      </a>
                    ) : (
                      task.title
                    )}
                  </td>
                  <td className="py-2.5 text-right font-mono text-accent tabular-nums">
                    {formatDuration(task.totalMinutes)}
                  </td>
                  <td className="py-2.5 text-right font-mono text-muted tabular-nums">
                    {task.entryCount}
                  </td>
                  <td className="py-2.5 text-right font-mono text-muted tabular-nums">
                    {new Date(task.lastActivity).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
