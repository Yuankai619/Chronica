import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock `server-only` so the module can be imported in a test environment.
vi.mock("server-only", () => ({}));

import type { TimerSession } from "./timer";
import { saveAndClearSession } from "./timer";

/**
 * Creates a mock Supabase client that tracks inserts and deletes,
 * and can simulate concurrent calls sharing the same backing store.
 */
function createMockSupabase() {
  // Backing store for timer_sessions — keyed by id.
  const sessions = new Map<string, TimerSession>();
  const inserts: Array<Record<string, unknown>> = [];
  const plannedItemUpdates: string[] = [];

  function from(table: string) {
    if (table === "timer_sessions") {
      return {
        delete() {
          // Fluent builder: .delete().eq().select()
          let matchId: string | null = null;
          const builder: Record<string, unknown> = {};
          builder.eq = (_col: string, val: string) => {
            matchId = val;
            return builder;
          };
          builder.select = (_cols?: string) => {
            const deleted: TimerSession[] = [];
            if (matchId && sessions.has(matchId)) {
              deleted.push(sessions.get(matchId)!);
              sessions.delete(matchId);
            }
            return Promise.resolve({ data: deleted, error: null });
          };
          return builder;
        },
      };
    }

    if (table === "time_entries") {
      return {
        insert(row: Record<string, unknown>) {
          inserts.push(row);
          return Promise.resolve({ data: null, error: null });
        },
      };
    }

    if (table === "planned_items") {
      return {
        update(_row: Record<string, unknown>) {
          const builder: Record<string, unknown> = {};
          builder.eq = (_col: string, val: string) => {
            plannedItemUpdates.push(val);
            return Promise.resolve({ data: null, error: null });
          };
          return builder;
        },
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  }

  return {
    supabase: { from } as unknown as Parameters<typeof saveAndClearSession>[0],
    sessions,
    inserts,
    plannedItemUpdates,
  };
}

function makeSession(overrides?: Partial<TimerSession>): TimerSession {
  return {
    id: "session-1",
    user_id: "user-1",
    category_id: "cat-1",
    started_at: new Date(Date.now() - 60 * 60_000).toISOString(), // 1 hour ago
    cap_minutes: 240,
    expected_minutes: null,
    planned_item_id: null,
    todo_task_id: null,
    todo_task_title: null,
    todo_list_id: null,
    ...overrides,
  } as TimerSession;
}

describe("saveAndClearSession", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("inserts exactly one time entry and deletes the session", async () => {
    const mock = createMockSupabase();
    const session = makeSession();
    mock.sessions.set(session.id, session);

    const result = await saveAndClearSession(
      mock.supabase,
      session,
      new Date(),
    );

    expect(result.error).toBeUndefined();
    expect(mock.inserts).toHaveLength(1);
    expect(mock.inserts[0].user_id).toBe("user-1");
    expect(mock.inserts[0].category_id).toBe("cat-1");
    expect(mock.inserts[0].source).toBe("timer");
    // Session row should be gone.
    expect(mock.sessions.has(session.id)).toBe(false);
  });

  it("marks planned_items.auto_timer_done for calendar sessions", async () => {
    const mock = createMockSupabase();
    const session = makeSession({
      planned_item_id: "plan-42",
    });
    mock.sessions.set(session.id, session);

    await saveAndClearSession(mock.supabase, session, new Date());

    expect(mock.plannedItemUpdates).toContain("plan-42");
  });

  it("second concurrent call for the same session is a no-op (no duplicate entry)", async () => {
    const mock = createMockSupabase();
    const session = makeSession();
    mock.sessions.set(session.id, session);

    // Simulate two concurrent calls sharing the same backing store.
    // The first call deletes the session; the second finds nothing to delete.
    const [r1, r2] = await Promise.all([
      saveAndClearSession(mock.supabase, session, new Date()),
      saveAndClearSession(mock.supabase, session, new Date()),
    ]);

    expect(r1.error).toBeUndefined();
    expect(r2.error).toBeUndefined();
    // Only one entry should have been inserted.
    expect(mock.inserts).toHaveLength(1);
  });

  it("concurrent calendar calls only mark planned item once", async () => {
    const mock = createMockSupabase();
    const session = makeSession({ planned_item_id: "plan-99" });
    mock.sessions.set(session.id, session);

    const [r1, r2] = await Promise.all([
      saveAndClearSession(mock.supabase, session, new Date()),
      saveAndClearSession(mock.supabase, session, new Date()),
    ]);

    expect(r1.error).toBeUndefined();
    expect(r2.error).toBeUndefined();
    expect(mock.inserts).toHaveLength(1);
    // auto_timer_done should only be set once.
    expect(
      mock.plannedItemUpdates.filter((id) => id === "plan-99"),
    ).toHaveLength(1);
  });
});
