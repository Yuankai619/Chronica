import { describe, expect, it, vi, beforeEach } from "vitest";
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

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "user-1" } } }),
    },
    from: (table: string) => ({
      update: (payload: unknown) => builder(table, "update", payload),
      delete: () => builder(table, "delete"),
    }),
  }),
}));

import { deleteEntry } from "./actions";

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
