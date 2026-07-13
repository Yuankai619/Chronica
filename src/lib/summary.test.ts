import { describe, expect, it } from "vitest";
import type { Category } from "@/lib/categories";
import type { TimeEntry } from "@/lib/entries";
import { monthlyRecordedTrend, summarizePeriod } from "./summary";

function category(id: string): Category {
  return {
    id,
    user_id: "u",
    name: id,
    color: null,
    description: null,
    archived_at: null,
    created_at: "",
    updated_at: "",
  };
}

function entry(
  categoryId: string,
  minutes: number,
  startedAt = "2026-07-10T09:00:00Z",
): TimeEntry {
  return {
    id: `${categoryId}-${minutes}-${startedAt}`,
    user_id: "u",
    category_id: categoryId,
    started_at: startedAt,
    duration_minutes: minutes,
    note: null,
    source: "manual",
    needs_confirmation: false,
    todo_task_id: null,
    todo_task_title: null,
    todo_list_id: null,
    created_at: "",
    updated_at: "",
  };
}

const work = category("work");
const email = category("email");
const games = category("games");

describe("summarizePeriod", () => {
  it("totals per category with entry counts", () => {
    const summary = summarizePeriod(
      [work, email, games],
      [
        entry("work", 120),
        entry("work", 60),
        entry("email", 30),
        entry("games", 90),
        entry("games", 45),
      ],
    );
    expect(summary.totalMinutes).toBe(345);
    const gamesRow = summary.categories.find((r) => r.category.id === "games")!;
    expect(gamesRow.entryCount).toBe(2);
    expect(summary.categories[0].category.id).toBe("work");
  });
});

describe("monthlyRecordedTrend", () => {
  it("buckets recorded time by month", () => {
    const trend = monthlyRecordedTrend(
      [
        entry("work", 100, "2026-01-05T09:00:00Z"),
        entry("work", 50, "2026-07-05T09:00:00Z"),
        entry("games", 500, "2026-07-06T09:00:00Z"),
      ],
      "UTC",
    );
    expect(trend[0]).toBe(100);
    expect(trend[6]).toBe(550);
  });
});
