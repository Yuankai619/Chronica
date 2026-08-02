import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { deletedRetentionCutoff } from "@/lib/entries";

const calls: Array<{
  table: string;
  op: string;
  payload?: unknown;
  filters: Array<[string, string, unknown]>;
}> = [];

function builder(table: string, op: string, payload?: unknown) {
  const filters: Array<[string, string, unknown]> = [];
  calls.push({ table, op, payload, filters });
  const chain: Record<string, unknown> = {};
  const record = (name: string) => (col: string, value: unknown) => {
    filters.push([name, col, value]);
    return chain;
  };
  chain.eq = record("eq");
  chain.lt = record("lt");
  chain.then = (resolve: (value: { error: null }) => unknown) =>
    resolve({ error: null });
  return chain;
}

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const redirects: string[] = [];
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    redirects.push(url);
  },
}));

vi.mock("@/server/tz", () => ({ getUserTimeZone: async () => "Asia/Taipei" }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "user-1" } } }),
    },
    from: (table: string) => ({
      insert: (payload: unknown) => builder(table, "insert", payload),
      update: (payload: unknown) => builder(table, "update", payload),
      delete: () => builder(table, "delete"),
    }),
  }),
}));

import { createEntry, deleteEntry } from "./actions";

function quickAdd(startedAt: string): FormData {
  const form = new FormData();
  form.set("category_id", "cat-1");
  form.set("started_at", startedAt);
  form.set("duration", "30");
  form.set("note", "");
  return form;
}

describe("deleteEntry", () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it("soft deletes by stamping deleted_at instead of removing the row", async () => {
    await deleteEntry("entry-1");

    const update = calls.find((c) => c.op === "update");
    expect(update?.table).toBe("time_entries");
    expect(
      typeof (update?.payload as { deleted_at?: unknown }).deleted_at,
    ).toBe("string");
  });

  it("stamps only the targeted row", async () => {
    await deleteEntry("entry-1");

    const update = calls.find((c) => c.op === "update");
    expect(update?.filters).toEqual([["eq", "id", "entry-1"]]);
  });

  it("purges only rows deleted before the retention cutoff", async () => {
    const before = deletedRetentionCutoff();
    await deleteEntry("entry-1");
    const after = deletedRetentionCutoff();

    const purge = calls.find((c) => c.op === "delete");
    expect(purge?.table).toBe("time_entries");
    expect(purge?.filters).toHaveLength(1);
    const [operator, column, value] = purge!.filters[0];
    expect(operator).toBe("lt");
    expect(column).toBe("deleted_at");
    expect(Date.parse(value as string)).toBeGreaterThanOrEqual(
      before.getTime(),
    );
    expect(Date.parse(value as string)).toBeLessThanOrEqual(after.getTime());
  });

  it("stamps before it purges", async () => {
    await deleteEntry("entry-1");

    expect(calls.map((c) => c.op)).toEqual(["update", "delete"]);
  });
});

describe("createEntry", () => {
  beforeEach(() => {
    calls.length = 0;
    redirects.length = 0;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-02T09:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays put when the entry lands in the current week", async () => {
    await createEntry(quickAdd("2026-07-30T09:00:00Z"));

    expect(calls.some((c) => c.op === "insert")).toBe(true);
    expect(redirects).toEqual([]);
  });

  it("navigates to the week the entry landed in", async () => {
    await createEntry(quickAdd("2026-07-16T09:00:00Z"));

    expect(redirects).toEqual(["/entries?week=2026-07-13"]);
  });
});
