"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startTimer, stopTimer } from "@/app/(app)/timer-actions";
import type { Tables } from "@/lib/database.types";
import type { Category } from "@/lib/categories";

type TimerSession = Tables<"timer_sessions">;

const CHECK_IN_INTERVAL_MINUTES = 15;

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function notify(title: string, body: string) {
  new Notification(title, { body, tag: "chronica-timer" });
}

function StartForm({ categories }: { categories: Category[] }) {
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
      <p className="muted">
        Create a category first, then start your first timer.
      </p>
    );
  }

  return (
    <form action={submit} className="timer-start-form">
      <select name="category_id" aria-label="Category" required>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <input
        name="expected_minutes"
        type="number"
        min={1}
        step={1}
        placeholder="Expected minutes (optional)"
        aria-label="Expected minutes"
      />
      <button className="button" type="submit" disabled={pending}>
        {pending ? "Starting…" : "Start"}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </form>
  );
}

function RunningTimer({
  session,
  categoryName,
}: {
  session: TimerSession;
  categoryName: string;
}) {
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
    <div className="timer-running">
      <p className="timer-category">{categoryName}</p>
      <p className="timer-elapsed">{formatElapsed(elapsedSeconds)}</p>
      {session.expected_minutes !== null ? (
        <p className={expectedReached ? "timer-over" : "muted"}>
          {expectedReached
            ? `Expected ${session.expected_minutes} min passed`
            : `Expected: ${session.expected_minutes} min`}
        </p>
      ) : null}
      {notificationsBlocked ? (
        <p className="timer-banner">
          Browser notifications are off — reminders will only appear here and in
          the tab title.
        </p>
      ) : null}
      <button
        className="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await stopTimer();
          })
        }
      >
        {pending ? "Stopping…" : "Stop"}
      </button>
    </div>
  );
}

export function TimerPanel({
  categories,
  session,
}: {
  categories: Category[];
  session: TimerSession | null;
}) {
  const categoryName =
    (session && categories.find((c) => c.id === session.category_id)?.name) ??
    "Unknown category";

  return (
    <div className="timer-panel">
      {session ? (
        <RunningTimer session={session} categoryName={categoryName} />
      ) : null}
      <section>
        {session ? (
          <p className="muted timer-switch-hint">
            Start another category to switch — the running timer is saved
            automatically.
          </p>
        ) : null}
        <StartForm categories={categories} />
      </section>
    </div>
  );
}
