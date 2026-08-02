import { describe, expect, it, vi, beforeEach } from "vitest";

const calls: Array<{ table: string; op: string; payload?: unknown }> = [];

function builder(table: string, op: string, payload?: unknown) {
  calls.push({ table, op, payload });
  const chain: Record<string, unknown> = {};
  const passthrough = () => chain;
  chain.eq = passthrough;
  chain.lt = passthrough;
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

  it("purges rows past the retention window in the same call", async () => {
    await deleteEntry("entry-1");

    const purge = calls.find((c) => c.op === "delete");
    expect(purge?.table).toBe("time_entries");
  });

  it("stamps before it purges", async () => {
    await deleteEntry("entry-1");

    expect(calls.map((c) => c.op)).toEqual(["update", "delete"]);
  });
});
