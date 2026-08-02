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

/**
 * The due date as written. Graph sends UTC midnight to mean a plain date,
 * so converting it to a timezone would shift the day west of UTC.
 */
export function dueDateKey(dueDate: string | null): string | null {
  return dueDate ? dueDate.slice(0, 10) : null;
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

export interface PickerSections {
  /** Overdue and due-today tasks, flattened across lists. */
  due: TodoTask[];
  groups: { list: string; tasks: TodoTask[] }[];
}

function byDueThenTitle(a: TodoTask, b: TodoTask): number {
  const aKey = dueDateKey(a.dueDate);
  const bKey = dueDateKey(b.dueDate);
  // No due date means no urgency signal, so those sink to the bottom.
  if (aKey === null || bKey === null) {
    if (aKey !== bKey) return aKey === null ? 1 : -1;
  } else if (aKey !== bKey) {
    return aKey < bKey ? -1 : 1;
  }
  return a.title.localeCompare(b.title);
}

/**
 * Splits the picker into a pinned "due now" section and the usual list
 * groups. Pinned tasks are removed from their group so no task appears twice.
 */
export function sortTasksForPicker(
  tasks: TodoTask[],
  todayKey: string,
): PickerSections {
  const due: TodoTask[] = [];
  const rest: TodoTask[] = [];
  for (const task of tasks) {
    const key = dueDateKey(task.dueDate);
    if (key !== null && key <= todayKey) due.push(task);
    else rest.push(task);
  }

  return {
    due: due.toSorted(byDueThenTitle),
    groups: groupTasksByList(rest).map((group) => ({
      list: group.list,
      tasks: group.tasks.toSorted(byDueThenTitle),
    })),
  };
}

/** Every task in the sections, for lookups that need a flat list. */
export function pickerTasks(sections: PickerSections): TodoTask[] {
  return [...sections.due, ...sections.groups.flatMap((g) => g.tasks)];
}

/**
 * Whether a task should still be listed as open. Absence from the open set
 * only means "completed elsewhere" when that set is known to be complete;
 * a truncated fetch would otherwise make live tasks vanish.
 */
export function looksStillOpen(
  taskId: string,
  openIds: Set<string>,
  truncated: boolean,
): boolean {
  return truncated || openIds.has(taskId);
}

/**
 * Locally-completed ids that Microsoft reports as open again, so the local
 * record can be dropped. Microsoft owns the task's state.
 */
export function reopenedTaskIds(
  completedIds: Iterable<string>,
  openIds: Set<string>,
  truncated: boolean,
): string[] {
  if (truncated) return [];
  return [...completedIds].filter((id) => openIds.has(id));
}
