import { describe, expect, it } from "vitest";
import type { Category } from "@/lib/categories";
import type { TimeEntry } from "@/lib/entries";
import { monthlyEffectiveTrend, summarizePeriod } from "./summary";

function category(id: string, group: Category["category_group"]): Category {
  return {
    id,
    user_id: "u",
    name: id,
    category_group: group,
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

const work = category("work", "core");
const email = category("email", "supportive");
const games = category("games", "rest");

describe("summarizePeriod", () => {
  it("totals per category and group with entry counts", () => {
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
    expect(summary.effectiveWorkMinutes).toBe(210);
    expect(summary.groupTotals.rest).toBe(135);
    const gamesRow = summary.categories.find((r) => r.category.id === "games")!;
    expect(gamesRow.entryCount).toBe(2);
    expect(summary.categories[0].category.id).toBe("work");
  });
});

describe("monthlyEffectiveTrend", () => {
  it("buckets effective work by month, ignoring rest", () => {
    const trend = monthlyEffectiveTrend(
      [work, games],
      [
        entry("work", 100, new Date(2026, 0, 5, 9).toISOString()),
        entry("work", 50, new Date(2026, 6, 5, 9).toISOString()),
        entry("games", 500, new Date(2026, 6, 6, 9).toISOString()),
      ],
    );
    expect(trend[0]).toBe(100);
    expect(trend[6]).toBe(50);
    expect(trend.reduce((a, b) => a + b, 0)).toBe(150);
  });
});
