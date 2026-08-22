import { describe, expect, it } from "vitest";
import type { Category } from "@/lib/categories";
import type { TimeEntry } from "@/lib/entries";
import {
  bucketPlannedMinutesByWeek,
  bucketRecordedMinutesByWeek,
  summarizePeriod,
  weeklyHistoryWeeks,
} from "./summary";

function category(id: string, excluded = false): Category {
  return {
    id,
    user_id: "u",
    name: id,
    color: null,
    description: null,
    archived_at: null,
    excluded_from_totals: excluded,
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
    deleted_at: null,
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

  it("lists an excluded category but keeps it out of the total", () => {
    const sleep = category("sleep", true);
    const summary = summarizePeriod(
      [work, sleep],
      [entry("work", 120), entry("sleep", 480), entry("sleep", 60)],
    );

    const sleepRow = summary.categories.find((r) => r.category.id === "sleep");
    expect(sleepRow?.totalMinutes).toBe(540);
    expect(summary.totalMinutes).toBe(120);
    expect(summary.excludedMinutes).toBe(540);
  });

  it("still counts excluded entries in entryCount", () => {
    const sleep = category("sleep", true);
    const summary = summarizePeriod(
      [work, sleep],
      [entry("work", 120), entry("sleep", 480)],
    );
    expect(summary.entryCount).toBe(2);
  });

  it("reports zero excluded minutes when nothing is flagged", () => {
    const summary = summarizePeriod([work], [entry("work", 120)]);
    expect(summary.excludedMinutes).toBe(0);
  });
});

describe("weeklyHistoryWeeks", () => {
  it("returns ascending Monday keys spanning the given range", () => {
    // 2026-01-05 is a Monday; 2026-01-19 is a Monday two weeks later.
    const weeks = weeklyHistoryWeeks("2026-01-05", "2026-01-19");
    expect(weeks).toEqual(["2026-01-05", "2026-01-12", "2026-01-19"]);
  });

  it("normalizes a mid-week start to that week's Monday", () => {
    // 2026-01-07 is a Wednesday, in the week starting 2026-01-05.
    const weeks = weeklyHistoryWeeks("2026-01-07", "2026-01-05");
    expect(weeks).toEqual(["2026-01-05"]);
  });
});

describe("bucketRecordedMinutesByWeek", () => {
  const weeks = weeklyHistoryWeeks("2026-01-05", "2026-01-12");

  it("sums minutes into the week each entry started in", () => {
    const buckets = bucketRecordedMinutesByWeek(
      [
        entry("work", 100, "2026-01-05T09:00:00Z"),
        entry("work", 50, "2026-01-13T09:00:00Z"),
        entry("games", 20, "2026-01-13T09:00:00Z"),
      ],
      weeks,
      "UTC",
      new Set(),
    );
    expect(buckets.total).toEqual([100, 70]);
    expect(buckets.byCategory.work).toEqual([100, 50]);
    expect(buckets.byCategory.games).toEqual([0, 20]);
  });

  it("drops entries outside the given weeks", () => {
    const buckets = bucketRecordedMinutesByWeek(
      [entry("work", 100, "2025-01-05T09:00:00Z")],
      weeks,
      "UTC",
      new Set(),
    );
    expect(buckets.total).toEqual([0, 0]);
  });

  it("leaves an excluded category out of the total but keeps its own row", () => {
    const buckets = bucketRecordedMinutesByWeek(
      [entry("sleep", 480, "2026-01-05T09:00:00Z")],
      weeks,
      "UTC",
      new Set(["sleep"]),
    );
    expect(buckets.total).toEqual([0, 0]);
    expect(buckets.byCategory.sleep).toEqual([480, 0]);
  });
});

describe("bucketPlannedMinutesByWeek", () => {
  const weeks = weeklyHistoryWeeks("2026-01-05", "2026-01-12");

  it("sums expected minutes into the week each item falls in", () => {
    const buckets = bucketPlannedMinutesByWeek(
      [
        { day: "2026-01-06", expected_minutes: 60, category_id: "work" },
        { day: "2026-01-12", expected_minutes: 30, category_id: "work" },
        { day: "2026-01-12", expected_minutes: 45, category_id: "games" },
      ],
      weeks,
    );
    expect(buckets.total).toEqual([60, 75]);
    expect(buckets.byCategory.work).toEqual([60, 30]);
  });

  it("still counts uncategorized items toward the total, not byCategory", () => {
    const buckets = bucketPlannedMinutesByWeek(
      [{ day: "2026-01-05", expected_minutes: 60, category_id: null }],
      weeks,
    );
    expect(buckets.total).toEqual([60, 0]);
    expect(buckets.byCategory).toEqual({});
  });
});
