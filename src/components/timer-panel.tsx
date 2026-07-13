"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CalendarClock, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTimer, stopTimer } from "@/app/(app)/timer-actions";
import type { Tables } from "@/lib/database.types";
import type { Category } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";
import type { TodoTask } from "@/lib/tasks";
import { TaskPicker } from "@/components/task-picker";
import type { PlannedItem } from "@/lib/plan-board";
import { formatDuration } from "@/lib/entries";
import { CategoryBadge } from "@/components/ui/badge";

type TimerSession = Tables<"timer_sessions">;

const CHECK_IN_INTERVAL_MINUTES = 15;

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function notify(title: string, body: string) {
  new Notification(title, { body, tag: "chronica-timer" });
}

function StartForm({
  categories,
  tasks,
}: {
  categories: Category[];
  tasks: TodoTask[] | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    // Ask for notification permission inside the user gesture.
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission();
    }
    startTransition(async () => {
      const result = await startTimer(formData);
      setError(result.error ?? null);
    });
  }

  if (categories.length === 0) {
    return (
      <p className="text-sm text-muted">
        Create a category first, then start your first timer.
      </p>
    );
  }

  return (
    <form action={submit} className="flex max-w-md flex-col gap-2.5">
      <Select name="category_id" aria-label="Category" required>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      <Input
        name="expected_minutes"
        type="number"
        min={1}
        step={1}
        placeholder="Expected minutes (optional)"
        aria-label="Expected minutes"
      />
      {tasks && tasks.length > 0 ? <TaskPicker tasks={tasks} /> : null}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Starting…" : "Start"}
      </Button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </form>
  );
}

function RunningTimer({
  session,
  categoryName,
  calendarEvent,
}: {
  session: TimerSession;
  categoryName: string;
  calendarEvent?: CalendarEventInfo | null;
}) {
  const isCalendar = calendarEvent != null;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [now, setNow] = useState(() => Date.now());
  const notifiedExpected = useRef(false);
  const lastCheckIn = useRef(0);

  const startedAtMs = new Date(session.started_at).getTime();
  const elapsedSeconds = Math.max(0, Math.floor((now - startedAtMs) / 1000));
  const elapsedMin = Math.floor(elapsedSeconds / 60);

  const notificationsBlocked =
    typeof Notification === "undefined" || Notification.permission === "denied";
  const expectedReached =
    session.expected_minutes !== null && elapsedMin >= session.expected_minutes;

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Expected-duration reminder + 15-minute check-ins (spec).
  useEffect(() => {
    if (session.expected_minutes === null) return;
    const overMin = elapsedMin - session.expected_minutes;
    if (overMin < 0) return;

    const canNotify =
      typeof Notification !== "undefined" &&
      Notification.permission === "granted";

    if (!notifiedExpected.current) {
      notifiedExpected.current = true;
      lastCheckIn.current = 0;
      if (canNotify) {
        notify(
          "Time is up",
          `${categoryName}: the expected ${session.expected_minutes} minutes have passed. The timer keeps running.`,
        );
      }
    } else {
      const checkIn = Math.floor(overMin / CHECK_IN_INTERVAL_MINUTES);
      if (checkIn > lastCheckIn.current) {
        lastCheckIn.current = checkIn;
        if (canNotify) {
          notify(
            "Still working?",
            `${categoryName} has been running ${elapsedMin} minutes — done yet?`,
          );
        }
      }
    }
  }, [elapsedMin, session.expected_minutes, categoryName]);

  // Reflect the timer in the tab title as a notification fallback.
  useEffect(() => {
    document.title = `${formatElapsed(elapsedSeconds)} · ${categoryName} — Chronica`;
    return () => {
      document.title = "Chronica";
    };
  }, [elapsedSeconds, categoryName]);

  // At the hard cap, refresh: the server reconciles (saves capped + flagged).
  useEffect(() => {
    if (elapsedMin >= session.cap_minutes) {
      router.refresh();
    }
  }, [elapsedMin, session.cap_minutes, router]);

  return (
    <Card
      className={`relative overflow-hidden ${isCalendar ? "border-[#2b4a63] bg-[#0d141b]" : ""}`}
    >
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 ${isCalendar ? "h-0.5 bg-[#7cc0f5]" : "h-px bg-accent"}`}
        aria-hidden
      />
      <div className="flex flex-col items-start gap-2">
        {isCalendar ? (
          <>
            <p className="flex items-center gap-1.5 text-[0.6875rem] tracking-[0.14em] text-[#7cc0f5] uppercase">
              <CalendarClock className="size-3.5" aria-hidden />
              Calendar session · {categoryName}
            </p>
            <p className="text-sm font-medium break-words">
              {calendarEvent.title}
            </p>
            {calendarEvent.startAt && calendarEvent.endAt ? (
              <p className="font-mono text-xs text-muted tabular-nums">
                {new Date(calendarEvent.startAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                –
                {new Date(calendarEvent.endAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            ) : null}
          </>
        ) : (
          <p className="microlabel">Recording · {categoryName}</p>
        )}
        <p
          className={`font-mono text-6xl font-semibold tracking-tight tabular-nums ${isCalendar ? "text-[#7cc0f5]" : ""}`}
        >
          {formatElapsed(elapsedSeconds)}
        </p>
        {isCalendar && session.expected_minutes !== null ? (
          <p className="text-sm text-muted">
            Ends automatically in{" "}
            {Math.max(0, session.expected_minutes - elapsedMin)} min
          </p>
        ) : session.expected_minutes !== null ? (
          <p
            className={`text-sm ${expectedReached ? "text-accent" : "text-muted"}`}
          >
            {expectedReached
              ? `Expected ${session.expected_minutes} min passed`
              : `Expected: ${session.expected_minutes} min`}
          </p>
        ) : null}
        {notificationsBlocked ? (
          <p className="rounded-md border border-accent-dim px-3 py-2 text-sm text-accent">
            Browser notifications are off — reminders will only appear here and
            in the tab title.
          </p>
        ) : null}
        <Button
          variant="outline"
          disabled={pending}
          className={
            isCalendar ? "border-[#2b4a63] hover:border-[#7cc0f5]" : ""
          }
          onClick={() =>
            startTransition(async () => {
              await stopTimer();
            })
          }
        >
          {pending ? "Stopping…" : isCalendar ? "Stop early" : "Stop"}
        </Button>
      </div>
    </Card>
  );
}

function QuickStart({
  plannedToday,
  categories,
}: {
  plannedToday: PlannedItem[];
  categories: Category[];
}) {
  const [pending, startTransition] = useTransition();
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  if (plannedToday.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <CardTitle className="mb-0">Planned today — tap to start</CardTitle>
      <div className="flex flex-wrap gap-2">
        {plannedToday.map((item) => {
          const category = item.category_id
            ? categoryById.get(item.category_id)
            : undefined;
          if (!category) return null;
          return (
            <button
              key={item.id}
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const formData = new FormData();
                  formData.set("category_id", category.id);
                  formData.set(
                    "expected_minutes",
                    String(item.expected_minutes),
                  );
                  await startTimer(formData);
                })
              }
              className="flex cursor-pointer items-center gap-2 rounded-md border border-hairline px-3 py-2 text-sm transition-colors hover:border-accent-dim disabled:opacity-50"
            >
              <CategoryBadge id={category.id} name={category.name} />
              <span className="font-mono text-xs text-accent tabular-nums">
                {formatDuration(item.expected_minutes)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export interface CalendarEventInfo {
  title: string;
  startAt: string | null;
  endAt: string | null;
}

/** Reloads server data exactly when the next calendar session begins. */
function CalendarAutoStart({ nextStartAt }: { nextStartAt: string }) {
  const router = useRouter();
  useEffect(() => {
    const delay = Math.max(0, Date.parse(nextStartAt) - Date.now()) + 500;
    const timeout = setTimeout(() => router.refresh(), delay);
    return () => clearTimeout(timeout);
  }, [nextStartAt, router]);
  return null;
}

export function TimerPanel({
  categories,
  session,
  tasks,
  plannedToday,
  calendarEvent = null,
  nextCalendarStartAt = null,
}: {
  categories: Category[];
  session: TimerSession | null;
  tasks: TodoTask[] | null;
  plannedToday: PlannedItem[];
  calendarEvent?: CalendarEventInfo | null;
  nextCalendarStartAt?: string | null;
}) {
  const categoryName =
    (session && categories.find((c) => c.id === session.category_id)?.name) ??
    "Unknown category";

  const calendarLocked = session?.planned_item_id != null;

  return (
    <div className="flex flex-col gap-8">
      {nextCalendarStartAt ? (
        <CalendarAutoStart nextStartAt={nextCalendarStartAt} />
      ) : null}
      {session ? (
        <RunningTimer
          session={session}
          categoryName={categoryName}
          calendarEvent={calendarLocked ? calendarEvent : null}
        />
      ) : null}
      {calendarLocked ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Lock className="size-3.5" aria-hidden />
          Manual timing is locked until this calendar session ends — or stop it
          early above.
        </p>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <CardTitle>
              {session ? "Switch category (saves the current timer)" : "Start"}
            </CardTitle>
            <StartForm categories={categories} tasks={tasks} />
          </section>
          <QuickStart plannedToday={plannedToday} categories={categories} />
        </>
      )}
    </div>
  );
}
