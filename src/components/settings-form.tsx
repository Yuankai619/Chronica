"use client";

import { useState, useTransition } from "react";
import { saveSettings } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";

export function SettingsForm({
  timerCapMinutes,
  dailyTargetMinutes,
}: {
  timerCapMinutes: number;
  dailyTargetMinutes: number;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await saveSettings(formData);
      setError(result.error ?? null);
      setSaved(!result.error);
    });
  }

  return (
    <Card className="max-w-md">
      <CardTitle>Recording</CardTitle>
      <form action={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span>Timer hard cap</span>
          <Input
            name="timer_cap"
            defaultValue={String(timerCapMinutes)}
            className="font-mono"
            required
          />
          <span className="text-xs text-muted">
            A session auto-stops and is flagged after this long. Minutes (240)
            or h:mm (4:00).
          </span>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span>Daily recording target</span>
          <Input
            name="daily_target"
            defaultValue={String(dailyTargetMinutes)}
            className="font-mono"
            required
          />
          <span className="text-xs text-muted">
            How many recorded hours you aim for each day — unrecorded time is
            measured against this. Minutes (840) or h:mm (14:00).
          </span>
        </label>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
          {saved ? (
            <span className="text-sm text-[#6fd29c]">Saved.</span>
          ) : null}
          {error ? <span className="text-sm text-danger">{error}</span> : null}
        </div>
      </form>
    </Card>
  );
}
