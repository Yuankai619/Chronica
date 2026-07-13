"use client";

import { useState, useTransition } from "react";
import { saveSettings } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";

export function SettingsForm({
  timerCapMinutes,
  timezone,
}: {
  timerCapMinutes: number;
  timezone: string;
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
    <Card>
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
          <span>Timezone</span>
          <select
            name="timezone"
            defaultValue={timezone}
            className="h-9 cursor-pointer rounded-md border border-hairline bg-panel px-3 text-sm focus:border-muted focus:outline-none"
          >
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted">
            Used to determine today for tasks and day boundaries.
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

const COMMON_TIMEZONES = [
  { value: "Asia/Taipei", label: "UTC+8 — Taipei, Singapore, Beijing" },
  { value: "Asia/Tokyo", label: "UTC+9 — Tokyo, Seoul" },
  { value: "Asia/Shanghai", label: "UTC+8 — Shanghai, Hong Kong" },
  { value: "Asia/Kolkata", label: "UTC+5:30 — India (IST)" },
  { value: "Asia/Dubai", label: "UTC+4 — Dubai" },
  { value: "Europe/London", label: "UTC+0 — London, Dublin" },
  { value: "Europe/Berlin", label: "UTC+1 — Berlin, Paris, Rome" },
  { value: "Europe/Moscow", label: "UTC+3 — Moscow" },
  { value: "America/New_York", label: "UTC-5 — New York, Toronto" },
  { value: "America/Chicago", label: "UTC-6 — Chicago, Dallas" },
  { value: "America/Denver", label: "UTC-7 — Denver, Phoenix" },
  { value: "America/Los_Angeles", label: "UTC-8 — Los Angeles, Vancouver" },
  { value: "Pacific/Auckland", label: "UTC+12 — Auckland" },
  { value: "Australia/Sydney", label: "UTC+10 — Sydney, Melbourne" },
];
