"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startTimer, stopTimer } from "@/app/(app)/timer-actions";
import type { Tables } from "@/lib/database.types";
import type { Category } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";

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
    <Card className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-accent"
        aria-hidden
      />
      <div className="flex flex-col items-start gap-2">
        <p className="microlabel">Recording · {categoryName}</p>
        <p className="font-mono text-6xl font-semibold tracking-tight tabular-nums">
          {formatElapsed(elapsedSeconds)}
        </p>
        {session.expected_minutes !== null ? (
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
          onClick={() =>
            startTransition(async () => {
              await stopTimer();
            })
          }
        >
          {pending ? "Stopping…" : "Stop"}
        </Button>
      </div>
    </Card>
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
    <div className="flex flex-col gap-8">
      {session ? (
        <RunningTimer session={session} categoryName={categoryName} />
      ) : null}
      <section className="flex flex-col gap-3">
        <CardTitle>
          {session ? "Switch category (saves the current timer)" : "Start"}
        </CardTitle>
        <StartForm categories={categories} />
      </section>
    </div>
  );
}
