import { describe, expect, it } from "vitest";
import {
  formatDuration,
  groupEntriesByDay,
  parseDurationInput,
  parseEntryInput,
  type TimeEntry,
} from "./entries";

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
      created_at: "",
      updated_at: "",
    };
  }

  it("groups by local day, newest first", () => {
    const groups = groupEntriesByDay([
      entry("a", new Date(2026, 6, 12, 9, 0).toISOString()),
      entry("b", new Date(2026, 6, 13, 8, 0).toISOString()),
      entry("c", new Date(2026, 6, 13, 22, 0).toISOString()),
    ]);
    expect(groups.map((g) => g.day)).toEqual(["2026-07-13", "2026-07-12"]);
    expect(groups[0].entries.map((e) => e.id)).toEqual(["c", "b"]);
  });
});
