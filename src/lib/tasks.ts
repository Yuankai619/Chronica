/** Encoding of a To Do task in form option values. */

export interface TaskRef {
  id: string;
  title: string;
}

export function encodeTaskOption(task: TaskRef): string {
  return JSON.stringify({ id: task.id, title: task.title });
}

/** Decodes a task form value; "" or malformed input → null. */
export function decodeTaskOption(raw: unknown): TaskRef | null {
  if (typeof raw !== "string" || raw === "") return null;
  try {
    const parsed = JSON.parse(raw) as { id?: unknown; title?: unknown };
    if (typeof parsed.id === "string" && typeof parsed.title === "string") {
      return { id: parsed.id, title: parsed.title };
    }
  } catch {
    // fall through
  }
  return null;
}
