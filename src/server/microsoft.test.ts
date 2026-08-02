import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

import { getOpenTasks, invalidateTaskCache } from "./microsoft";

function supabaseWithLinkedAccount() {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              access_token: "token",
              refresh_token: "refresh",
              expires_at: new Date(Date.now() + 3_600_000).toISOString(),
            },
          }),
        }),
      }),
    }),
  } as unknown as Parameters<typeof getOpenTasks>[0];
}

function graphStub(
  lists: Array<{ id: string; displayName: string }> | null,
  tasksByList: Record<string, Array<{ id: string; title: string }> | null>,
) {
  return vi.fn(async (url: string) => {
    if (url.endsWith("/me/todo/lists")) {
      if (!lists) return { ok: false, json: async () => ({}) };
      return { ok: true, json: async () => ({ value: lists }) };
    }
    const listId = url.split("/me/todo/lists/")[1].split("/")[0];
    const value = tasksByList[listId];
    if (!value) return { ok: false, json: async () => ({}) };
    return { ok: true, json: async () => ({ value }) };
  });
}

function tasks(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `t${i}`,
    title: `Task ${i}`,
  }));
}

describe("getOpenTasks", () => {
  beforeEach(() => {
    invalidateTaskCache("user-1");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    invalidateTaskCache("user-1");
  });

  it("is complete when every list is fetched and none is full", async () => {
    vi.stubGlobal(
      "fetch",
      graphStub([{ id: "a", displayName: "Work" }], { a: tasks(3) }),
    );

    const result = await getOpenTasks(supabaseWithLinkedAccount(), "user-1");

    expect(result.truncated).toBe(false);
    expect(result.tasks).toHaveLength(3);
  });

  it("is truncated when a list request fails", async () => {
    vi.stubGlobal(
      "fetch",
      graphStub(
        [
          { id: "a", displayName: "Work" },
          { id: "b", displayName: "Home" },
        ],
        { a: tasks(1), b: null },
      ),
    );

    const result = await getOpenTasks(supabaseWithLinkedAccount(), "user-1");

    expect(result.truncated).toBe(true);
    expect(result.tasks).toHaveLength(1);
  });

  it("is truncated when a list fills the page size", async () => {
    vi.stubGlobal(
      "fetch",
      graphStub([{ id: "a", displayName: "Work" }], { a: tasks(50) }),
    );

    const result = await getOpenTasks(supabaseWithLinkedAccount(), "user-1");

    expect(result.truncated).toBe(true);
  });

  it("is truncated when there are more lists than the cap", async () => {
    const lists = Array.from({ length: 11 }, (_, i) => ({
      id: `l${i}`,
      displayName: `List ${i}`,
    }));
    const byList = Object.fromEntries(lists.map((l) => [l.id, tasks(1)]));
    vi.stubGlobal("fetch", graphStub(lists, byList));

    const result = await getOpenTasks(supabaseWithLinkedAccount(), "user-1");

    expect(result.truncated).toBe(true);
    // Only the first ten lists are fetched.
    expect(result.tasks).toHaveLength(10);
  });

  it("is truncated when the lists request itself fails", async () => {
    vi.stubGlobal("fetch", graphStub(null, {}));

    const result = await getOpenTasks(supabaseWithLinkedAccount(), "user-1");

    expect(result).toEqual({ tasks: [], truncated: true });
  });
});
