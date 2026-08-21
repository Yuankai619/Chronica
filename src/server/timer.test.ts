import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock `server-only` so the module can be imported in a test environment.
vi.mock("server-only", () => ({}));

import type { TimerSession } from "./timer";
import { backfillCalendarEntries, saveAndClearSession } from "./timer";

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
    planned_item_title: null,
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

  it("copies the snapshotted calendar title into the entry note", async () => {
    const mock = createMockSupabase();
    const session = makeSession({
      planned_item_id: "plan-42",
      planned_item_title: "Q3 planning",
    });
    mock.sessions.set(session.id, session);

    await saveAndClearSession(mock.supabase, session, new Date());

    expect(mock.inserts[0].note).toBe("Q3 planning");
  });

  it("writes the note even when the calendar item was deleted mid-session", async () => {
    const mock = createMockSupabase();
    // The sync deletes the planned item and the FK sets planned_item_id null.
    const session = makeSession({
      planned_item_id: null,
      planned_item_title: "Q3 planning",
    });
    mock.sessions.set(session.id, session);

    await saveAndClearSession(mock.supabase, session, new Date());

    expect(mock.inserts[0].note).toBe("Q3 planning");
  });

  it("leaves the note null for a manual session", async () => {
    const mock = createMockSupabase();
    const session = makeSession();
    mock.sessions.set(session.id, session);

    await saveAndClearSession(mock.supabase, session, new Date());

    expect(mock.inserts[0].note).toBeNull();
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

/**
 * Mock Supabase for the backfill path: an in-memory planned_items table
 * supporting the filter chain plus conditional (claiming) updates.
 */
function createBackfillMock(items: Record<string, unknown>[]) {
  const rows = items.map((item) => ({ ...item }));
  const inserts: Array<Record<string, unknown>> = [];
  let insertFails = false;

  function plannedItemsBuilder() {
    const filters: Array<(row: Record<string, unknown>) => boolean> = [];
    const builder: Record<string, unknown> = {};
    let patch: Record<string, unknown> | null = null;

    const match = () => rows.filter((row) => filters.every((f) => f(row)));

    builder.eq = (col: string, val: unknown) => {
      filters.push((row) => row[col] === val);
      return builder;
    };
    builder.not = (col: string, _op: string, _val: unknown) => {
      filters.push((row) => row[col] !== null && row[col] !== undefined);
      return builder;
    };
    builder.lte = (col: string, val: string) => {
      filters.push((row) => String(row[col]) <= val);
      return builder;
    };
    builder.gte = (col: string, val: string) => {
      filters.push((row) => String(row[col]) >= val);
      return builder;
    };
    builder.order = () => Promise.resolve({ data: match(), error: null });
    builder.select = () => {
      const matched = match();
      if (patch) for (const row of matched) Object.assign(row, patch);
      return Promise.resolve({ data: matched, error: null });
    };
    builder.applyUpdate = (row: Record<string, unknown>) => {
      patch = row;
      // A bare .update().eq() with no .select() still has to apply.
      const original = builder.eq as (c: string, v: unknown) => unknown;
      builder.eq = (col: string, val: unknown) => {
        original(col, val);
        const result = { ...builder } as Record<string, unknown>;
        result.then = (resolve: (v: unknown) => unknown) => {
          for (const target of match()) Object.assign(target, patch);
          return Promise.resolve(resolve({ data: null, error: null }));
        };
        return result;
      };
      return builder;
    };
    return builder;
  }

  function from(table: string) {
    if (table === "planned_items") {
      return {
        select: () => plannedItemsBuilder(),
        update: (row: Record<string, unknown>) => {
          const builder = plannedItemsBuilder();
          return (
            builder.applyUpdate as (r: Record<string, unknown>) => unknown
          )(row);
        },
      };
    }
    if (table === "time_entries") {
      return {
        insert(row: Record<string, unknown>) {
          if (insertFails) {
            return Promise.resolve({
              data: null,
              error: { message: "insert failed" },
            });
          }
          inserts.push(row);
          return Promise.resolve({ data: null, error: null });
        },
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  }

  return {
    supabase: { from } as unknown as Parameters<
      typeof backfillCalendarEntries
    >[0],
    rows,
    inserts,
    failInserts: () => {
      insertFails = true;
    },
  };
}

function makePlannedItem(overrides?: Record<string, unknown>) {
  return {
    id: "plan-1",
    user_id: "user-1",
    category_id: "cat-1",
    auto_timer_done: false,
    gcal_event_id: "evt-1",
    title: "Deep work",
    start_at: "2026-08-22T09:00:00.000Z",
    end_at: "2026-08-22T10:00:00.000Z",
    ...overrides,
  };
}

describe("backfillCalendarEntries", () => {
  const now = new Date("2026-08-22T12:00:00.000Z");

  it("records a window that ended while the app was never open", async () => {
    const mock = createBackfillMock([makePlannedItem()]);

    await backfillCalendarEntries(mock.supabase, "user-1", now);

    expect(mock.inserts).toHaveLength(1);
    expect(mock.inserts[0]).toMatchObject({
      user_id: "user-1",
      category_id: "cat-1",
      started_at: "2026-08-22T09:00:00.000Z",
      duration_minutes: 60,
      source: "timer",
      note: "Deep work",
      needs_confirmation: false,
    });
    expect(mock.rows[0].auto_timer_done).toBe(true);
  });

  it("skips items already recorded, uncategorised, or not from the calendar", async () => {
    const mock = createBackfillMock([
      makePlannedItem({ id: "done", auto_timer_done: true }),
      makePlannedItem({ id: "no-category", category_id: null }),
      makePlannedItem({ id: "manual", gcal_event_id: null }),
    ]);

    await backfillCalendarEntries(mock.supabase, "user-1", now);

    expect(mock.inserts).toHaveLength(0);
  });

  it("skips a window that has not ended yet", async () => {
    const mock = createBackfillMock([
      makePlannedItem({ end_at: "2026-08-22T13:00:00.000Z" }),
    ]);

    await backfillCalendarEntries(mock.supabase, "user-1", now);

    expect(mock.inserts).toHaveLength(0);
  });

  it("skips windows older than the lookback bound", async () => {
    const mock = createBackfillMock([
      makePlannedItem({
        start_at: "2026-08-01T09:00:00.000Z",
        end_at: "2026-08-01T10:00:00.000Z",
      }),
    ]);

    await backfillCalendarEntries(mock.supabase, "user-1", now);

    expect(mock.inserts).toHaveLength(0);
  });

  it("leaves the running session's own item to its stop path", async () => {
    const mock = createBackfillMock([makePlannedItem()]);

    await backfillCalendarEntries(mock.supabase, "user-1", now, "plan-1");

    expect(mock.inserts).toHaveLength(0);
    expect(mock.rows[0].auto_timer_done).toBe(false);
  });

  it("records each missed window exactly once across renders", async () => {
    const mock = createBackfillMock([makePlannedItem()]);

    await backfillCalendarEntries(mock.supabase, "user-1", now);
    await backfillCalendarEntries(mock.supabase, "user-1", now);

    expect(mock.inserts).toHaveLength(1);
  });

  it("releases the claim when the entry insert fails", async () => {
    const mock = createBackfillMock([makePlannedItem()]);
    mock.failInserts();

    await backfillCalendarEntries(mock.supabase, "user-1", now);

    expect(mock.inserts).toHaveLength(0);
    expect(mock.rows[0].auto_timer_done).toBe(false);
  });
});
