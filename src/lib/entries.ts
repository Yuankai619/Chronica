import type { Tables } from "@/lib/database.types";

export type TimeEntry = Tables<"time_entries">;

/** "1:30" or "90" → minutes; null when invalid. */
export function parseDurationInput(raw: string): number | null {
  const value = raw.trim();
  if (value === "") return null;

  const colonMatch = /^(\d{1,2}):([0-5]\d)$/.exec(value);
  if (colonMatch) {
    const minutes = Number(colonMatch[1]) * 60 + Number(colonMatch[2]);
    return minutes > 0 ? minutes : null;
  }

  if (/^\d+$/.test(value)) {
    const minutes = Number(value);
    return minutes > 0 && minutes <= 24 * 60 ? minutes : null;
  }

  return null;
}

/** 95 → "1h 35m", 45 → "45m". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export interface EntryInput {
  category_id: string;
  started_at: string;
  duration_minutes: number;
  note: string | null;
}

/** Validates quick-add / edit form values. */
export function parseEntryInput(values: {
  category_id: unknown;
  started_at: unknown;
  duration: unknown;
  note: unknown;
}): { ok: true; input: EntryInput } | { ok: false; error: string } {
  if (
    typeof values.category_id !== "string" ||
    values.category_id.length === 0
  ) {
    return { ok: false, error: "A category is required." };
  }

  const duration =
    typeof values.duration === "string"
      ? parseDurationInput(values.duration)
      : null;
  if (duration === null) {
    return {
      ok: false,
      error: "Duration must be minutes (e.g. 90) or h:mm (e.g. 1:30).",
    };
  }

  const startedAtRaw =
    typeof values.started_at === "string" ? values.started_at : "";
  const startedAt = new Date(startedAtRaw);
  if (startedAtRaw === "" || Number.isNaN(startedAt.getTime())) {
    return { ok: false, error: "A valid start time is required." };
  }

  const note = typeof values.note === "string" ? values.note.trim() : "";

  return {
    ok: true,
    input: {
      category_id: values.category_id,
      started_at: startedAt.toISOString(),
      duration_minutes: duration,
      note: note.length > 0 ? note : null,
    },
  };
}

/** Groups entries by local calendar day key (YYYY-MM-DD), newest day first. */
export function groupEntriesByDay(
  entries: TimeEntry[],
): { day: string; entries: TimeEntry[] }[] {
  const groups = new Map<string, TimeEntry[]>();
  const sorted = entries.toSorted(
    (a, b) => Date.parse(b.started_at) - Date.parse(a.started_at),
  );
  for (const entry of sorted) {
    const d = new Date(entry.started_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(entry);
    } else {
      groups.set(key, [entry]);
    }
  }
  return [...groups.entries()].map(([day, dayEntries]) => ({
    day,
    entries: dayEntries,
  }));
}
