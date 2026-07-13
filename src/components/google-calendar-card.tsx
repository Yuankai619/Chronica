"use client";

import { useTransition } from "react";
import { unlinkGoogleCalendar } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";

export function GoogleCalendarCard({
  linkedEmail,
  status,
}: {
  linkedEmail: string | null | undefined;
  status?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardTitle>Google Calendar</CardTitle>
      {status === "error" ? (
        <p className="mb-3 text-sm text-danger">Linking failed — try again.</p>
      ) : null}
      {status === "unconfigured" ? (
        <p className="mb-3 text-sm text-danger">
          Server is missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.
        </p>
      ) : null}
      {linkedEmail !== undefined ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            Linked as{" "}
            <span className="font-medium">
              {linkedEmail ?? "Google account"}
            </span>
          </p>
          <p className="text-xs text-muted">
            Read-only: this week&apos;s calendar events can be synced onto the
            planning board. Nothing is ever written to your calendar.
          </p>
          <Button
            variant="outline"
            className="self-start"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await unlinkGoogleCalendar();
              })
            }
          >
            {pending ? "Unlinking…" : "Unlink"}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Link Google Calendar to pull scheduled events into your planning
            board as items you can categorize.
          </p>
          <Button
            className="self-start"
            onClick={() => {
              window.location.href = "/api/google/link";
            }}
          >
            Link Google Calendar
          </Button>
        </div>
      )}
    </Card>
  );
}
