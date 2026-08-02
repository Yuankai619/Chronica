import { describe, expect, it } from "vitest";
import {
  dueDateKey,
  looksStillOpen,
  reopenedTaskIds,
  sortTasksForPicker,
  type TodoTask,
} from "./tasks";

function task(
  id: string,
  listTitle: string,
  dueDate: string | null,
  title = id,
): TodoTask {
  return {
    id,
    title,
    listId: listTitle.toLowerCase(),
    listTitle,
    dueDate,
    description: null,
  };
}

describe("sortTasksForPicker", () => {
  const today = "2026-08-02";

  // The spec's worked example.
  const a = task("A", "Work", "2026-07-28T00:00:00");
  const b = task("B", "Home", "2026-08-02T00:00:00");
  const c = task("C", "Work", "2026-08-02T00:00:00");
  const d = task("D", "Work", "2026-08-05T00:00:00");
  const e = task("E", "Work", null);
  const f = task("F", "Home", null);

  it("pins overdue and due-today tasks, earliest first", () => {
    const { due } = sortTasksForPicker([d, c, b, a, e, f], today);
    expect(due.map((t) => t.id)).toEqual(["A", "B", "C"]);
  });

  it("keeps pinned tasks out of their list group", () => {
    const { groups } = sortTasksForPicker([a, b, c, d, e, f], today);
    const ids = groups.flatMap((g) => g.tasks.map((t) => t.id));
    expect(ids).not.toContain("A");
    expect(ids).not.toContain("B");
    expect(ids).not.toContain("C");
  });

  it("orders a group by due date, then title, with undated last", () => {
    const { groups } = sortTasksForPicker([a, b, c, d, e, f], today);
    const work = groups.find((g) => g.list === "Work")!;
    expect(work.tasks.map((t) => t.id)).toEqual(["D", "E"]);
  });

  it("keeps the Graph list order for groups", () => {
    const { groups } = sortTasksForPicker([f, d], today);
    expect(groups.map((g) => g.list)).toEqual(["Home", "Work"]);
  });

  it("drops a group whose tasks were all pinned", () => {
    const { groups } = sortTasksForPicker([a, b, c, d, e], today);
    expect(groups.map((g) => g.list)).toEqual(["Work"]);
  });

  it("returns empty sections for no tasks", () => {
    expect(sortTasksForPicker([], today)).toEqual({ due: [], groups: [] });
  });

  it("sorts same-day tasks by title, case-insensitively", () => {
    const apple = task("1", "Work", "2026-08-05T00:00:00", "apple");
    const banana = task("2", "Work", "2026-08-05T00:00:00", "Banana");
    const { groups } = sortTasksForPicker([banana, apple], today);
    expect(groups[0].tasks.map((t) => t.title)).toEqual(["apple", "Banana"]);
  });

  it("pins a task due late on the current day", () => {
    const tonight = task("late", "Work", "2026-08-02T23:59:00");
    const { due } = sortTasksForPicker([tonight], today);
    expect(due.map((t) => t.id)).toEqual(["late"]);
  });

  it("does not mutate the input", () => {
    const input = [d, a, e];
    sortTasksForPicker(input, today);
    expect(input.map((t) => t.id)).toEqual(["D", "A", "E"]);
  });
});

describe("looksStillOpen", () => {
  const openIds = new Set(["open-1"]);

  it("keeps a task Microsoft still reports as open", () => {
    expect(looksStillOpen("open-1", openIds, false)).toBe(true);
  });

  it("drops a task missing from a complete open set", () => {
    expect(looksStillOpen("gone", openIds, false)).toBe(false);
  });

  it("keeps everything when the open set is truncated", () => {
    // A throttled list would otherwise look like a batch of completions.
    expect(looksStillOpen("gone", openIds, true)).toBe(true);
  });
});

describe("reopenedTaskIds", () => {
  it("returns locally-completed ids that are open again", () => {
    const ids = reopenedTaskIds(["a", "b"], new Set(["b", "c"]), false);
    expect(ids).toEqual(["b"]);
  });

  it("returns nothing when the open set is truncated", () => {
    expect(reopenedTaskIds(["a"], new Set(["a"]), true)).toEqual([]);
  });

  it("returns nothing when no completed task is open again", () => {
    expect(reopenedTaskIds(["a"], new Set(["b"]), false)).toEqual([]);
  });
});

describe("dueDateKey", () => {
  it("takes the date as written, without converting timezones", () => {
    // Graph sends UTC midnight to mean a plain date; converting it would
    // shift the day backwards anywhere west of UTC.
    expect(dueDateKey("2026-07-20T00:00:00.0000000")).toBe("2026-07-20");
    expect(dueDateKey("2026-07-20T00:00:00Z")).toBe("2026-07-20");
  });

  it("ignores the time portion", () => {
    expect(dueDateKey("2026-07-20T23:59:00")).toBe("2026-07-20");
  });

  it("is null-safe", () => {
    expect(dueDateKey(null)).toBeNull();
  });
});
