/** To Do task shapes and form-value encoding. */

export interface TaskRef {
  id: string;
  title: string;
  listId: string | null;
}

/** A To Do task as fetched from Microsoft Graph (serializable). */
export interface TodoTask {
  id: string;
  title: string;
  listId: string;
  listTitle: string;
  /** Naive datetime string from Graph, or null. */
  dueDate: string | null;
  /** Plain-text body, for AI context. */
  description: string | null;
}

export function encodeTaskOption(task: TaskRef): string {
  return JSON.stringify({
    id: task.id,
    title: task.title,
    listId: task.listId,
  });
}

/** Decodes a task form value; "" or malformed input → null. */
export function decodeTaskOption(raw: unknown): TaskRef | null {
  if (typeof raw !== "string" || raw === "") return null;
  try {
    const parsed = JSON.parse(raw) as {
      id?: unknown;
      title?: unknown;
      listId?: unknown;
    };
    if (typeof parsed.id === "string" && typeof parsed.title === "string") {
      return {
        id: parsed.id,
        title: parsed.title,
        listId: typeof parsed.listId === "string" ? parsed.listId : null,
      };
    }
  } catch {
    // fall through
  }
  return null;
}

/** True when a task title is just a link (rendered as a hyperlink). */
export function isUrlTitle(title: string): boolean {
  return /^https?:\/\/\S+$/.test(title.trim());
}

/** "2026-07-20T00:00:00" (UTC from Graph) → local "2026-07-20"; null-safe. */
export function dueDateKey(dueDate: string | null): string | null {
  if (!dueDate) return null;
  // Graph returns UTC datetimes — convert to local date.
  const d = new Date(dueDate.endsWith("Z") ? dueDate : `${dueDate}Z`);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Groups tasks by list title, preserving encounter order. */
export function groupTasksByList(
  tasks: TodoTask[],
): { list: string; tasks: TodoTask[] }[] {
  const groups = new Map<string, TodoTask[]>();
  for (const task of tasks) {
    const bucket = groups.get(task.listTitle);
    if (bucket) {
      bucket.push(task);
    } else {
      groups.set(task.listTitle, [task]);
    }
  }
  return [...groups.entries()].map(([list, listTasks]) => ({
    list,
    tasks: listTasks,
  }));
}
