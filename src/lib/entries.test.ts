import { describe, expect, it } from "vitest";
import {
  DELETED_RETENTION_DAYS,
  deletedDaysLeft,
  deletedRetentionCutoff,
  formatDuration,
  groupEntriesByDay,
  parseDurationInput,
  parseEntryInput,
  type TimeEntry,
} from "./entries";

describe("deletedDaysLeft", () => {
  const now = new Date("2026-08-02T09:00:00.000Z");

  it("gives the full window to a row deleted just now", () => {
    expect(deletedDaysLeft("2026-08-02T09:00:00.000Z", now)).toBe(14);
  });

  it("counts down as the window elapses", () => {
    expect(deletedDaysLeft("2026-07-20T09:00:00.000Z", now)).toBe(1);
  });

  it("reports the last day rather than zero", () => {
    expect(deletedDaysLeft("2026-07-19T09:00:01.000Z", now)).toBe(1);
  });

  it("never goes below zero once past the window", () => {
    expect(deletedDaysLeft("2026-07-01T09:00:00.000Z", now)).toBe(0);
  });
});

describe("deletedRetentionCutoff", () => {
  it("is the retention window before the given instant", () => {
    const now = new Date("2026-08-02T09:00:00.000Z");
    expect(deletedRetentionCutoff(now).toISOString()).toBe(
      "2026-07-19T09:00:00.000Z",
    );
  });

  it("keeps a row deleted exactly at the boundary", () => {
    const now = new Date("2026-08-02T09:00:00.000Z");
    const deletedAt = new Date("2026-07-19T09:00:00.000Z");
    expect(deletedAt < deletedRetentionCutoff(now)).toBe(false);
  });

  it("purges a row deleted one millisecond earlier", () => {
    const now = new Date("2026-08-02T09:00:00.000Z");
    const deletedAt = new Date("2026-07-19T08:59:59.999Z");
    expect(deletedAt < deletedRetentionCutoff(now)).toBe(true);
  });

  it("retains for 14 days", () => {
    expect(DELETED_RETENTION_DAYS).toBe(14);
  });
});

describe("parseDurationInput", () => {
  it("parses plain minutes", () => {
    expect(parseDurationInput("90")).toBe(90);
  });

  it("parses h:mm", () => {
    expect(parseDurationInput("1:30")).toBe(90);
    expect(parseDurationInput("0:05")).toBe(5);
  });

  it("rejects zero, negatives, and garbage", () => {
    expect(parseDurationInput("0")).toBeNull();
    expect(parseDurationInput("-5")).toBeNull();
    expect(parseDurationInput("1:75")).toBeNull();
    expect(parseDurationInput("abc")).toBeNull();
    expect(parseDurationInput("")).toBeNull();
  });

  it("rejects more than 24 hours", () => {
    expect(parseDurationInput("1441")).toBeNull();
  });
});

describe("formatDuration", () => {
  it("formats minutes, hours, and mixes", () => {
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(120)).toBe("2h");
    expect(formatDuration(95)).toBe("1h 35m");
  });
});

describe("parseEntryInput", () => {
  const valid = {
    category_id: "cat-1",
    started_at: "2026-07-13T09:00",
    duration: "90",
    note: "  reading  ",
  };

  it("accepts valid input and trims the note", () => {
    const result = parseEntryInput(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.duration_minutes).toBe(90);
      expect(result.input.note).toBe("reading");
      expect(result.input.category_id).toBe("cat-1");
    }
  });

  it("rejects a missing category or bad duration", () => {
    expect(parseEntryInput({ ...valid, category_id: "" }).ok).toBe(false);
    expect(parseEntryInput({ ...valid, duration: "x" }).ok).toBe(false);
    expect(parseEntryInput({ ...valid, started_at: "nope" }).ok).toBe(false);
  });
});

describe("groupEntriesByDay", () => {
  function entry(id: string, startedAt: string): TimeEntry {
    return {
      id,
      user_id: "u",
      category_id: "c",
      started_at: startedAt,
      duration_minutes: 30,
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

  it("groups by the user's timezone, newest day first", () => {
    const groups = groupEntriesByDay(
      [
        entry("a", "2026-07-12T09:00:00Z"),
        entry("b", "2026-07-13T08:00:00Z"),
        entry("c", "2026-07-13T22:00:00Z"),
      ],
      "UTC",
    );
    expect(groups.map((g) => g.day)).toEqual(["2026-07-13", "2026-07-12"]);
    expect(groups[0].entries.map((e) => e.id)).toEqual(["c", "b"]);
  });

  it("puts the same instant on different days in different timezones", () => {
    // 2026-07-13 17:30 UTC = 2026-07-14 01:30 in Taipei (+8).
    const entries = [entry("a", "2026-07-13T17:30:00Z")];
    expect(groupEntriesByDay(entries, "UTC")[0].day).toBe("2026-07-13");
    expect(groupEntriesByDay(entries, "Asia/Taipei")[0].day).toBe("2026-07-14");
  });
});
