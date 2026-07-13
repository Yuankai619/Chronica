"use client";

import { useState } from "react";
import { formatDuration } from "@/lib/entries";
import { CategoryBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface WeekCompareRow {
  id: string;
  name: string;
  color: string | null;
  plannedMinutes: number;
  actualMinutes: number;
}

export interface RangeRow {
  id: string;
  name: string;
  color: string | null;
  /** Total minutes over the last 30 / 90 / 180 / 365 days. */
  totals: [number, number, number, number];
}

const RANGES = [
  { label: "1 mo", days: 30 },
  { label: "3 mo", days: 90 },
  { label: "6 mo", days: 180 },
  { label: "1 yr", days: 365 },
] as const;

type Mode = "both" | "planned" | "actual";

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-md border border-hairline text-xs">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "cursor-pointer px-2.5 py-1.5 transition-colors",
            value === option.value
              ? "bg-panel text-foreground"
              : "text-muted hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function BarRow({
  id,
  name,
  color,
  bars,
  max,
}: {
  id: string;
  name: string;
  color: string | null;
  bars: { minutes: number; solid: boolean }[];
  max: number;
}) {
  return (
    <div className="grid grid-cols-[minmax(6rem,10rem)_1fr] items-center gap-3">
      <CategoryBadge
        id={id}
        name={name}
        color={color}
        className="justify-self-start break-words whitespace-normal"
      />
      <div className="flex flex-col gap-1">
        {bars.map((bar, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-3.5 flex-1 rounded-sm bg-panel/40">
              <div
                className={cn(
                  "h-full rounded-sm",
                  bar.solid ? "bg-accent/80" : "bar-planned",
                )}
                style={{
                  width: `${max === 0 ? 0 : Math.round((bar.minutes / max) * 100)}%`,
                }}
              />
            </div>
            <span className="w-16 text-right font-mono text-xs text-muted tabular-nums">
              {formatDuration(bar.minutes)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Weekly planned-vs-actual comparison with a planned/actual/both toggle. */
export function WeekCompareChart({ rows }: { rows: WeekCompareRow[] }) {
  const [mode, setMode] = useState<Mode>("both");

  const visible = rows.filter(
    (r) => r.plannedMinutes > 0 || r.actualMinutes > 0,
  );
  if (visible.length === 0) {
    return (
      <p className="text-sm text-muted">
        Nothing planned or recorded this week.
      </p>
    );
  }

  const max = Math.max(
    ...visible.map((r) =>
      Math.max(
        mode !== "actual" ? r.plannedMinutes : 0,
        mode !== "planned" ? r.actualMinutes : 0,
      ),
    ),
    60,
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">Hatched = planned · solid = actual</p>
        <ToggleGroup
          options={[
            { value: "both", label: "Both" },
            { value: "planned", label: "Planned" },
            { value: "actual", label: "Actual" },
          ]}
          value={mode}
          onChange={setMode}
        />
      </div>
      <div className="flex flex-col gap-3">
        {visible.map((row) => (
          <BarRow
            key={row.id}
            id={row.id}
            name={row.name}
            color={row.color}
            max={max}
            bars={[
              ...(mode !== "actual"
                ? [{ minutes: row.plannedMinutes, solid: false }]
                : []),
              ...(mode !== "planned"
                ? [{ minutes: row.actualMinutes, solid: true }]
                : []),
            ]}
          />
        ))}
      </div>
    </div>
  );
}

/** Average executed hours per week per category over a selectable range. */
export function CategoryAverageChart({ rows }: { rows: RangeRow[] }) {
  const [rangeIndex, setRangeIndex] = useState(1); // default 3 months

  const weeks = RANGES[rangeIndex].days / 7;
  const averaged = rows
    .map((row) => ({
      ...row,
      average: Math.round(row.totals[rangeIndex] / weeks),
    }))
    .filter((row) => row.average > 0)
    .toSorted((a, b) => b.average - a.average);

  const max = Math.max(...averaged.map((r) => r.average), 60);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">
          Average recorded time per week ({RANGES[rangeIndex].label} window)
        </p>
        <ToggleGroup
          options={RANGES.map((range, i) => ({
            value: String(i),
            label: range.label,
          }))}
          value={String(rangeIndex)}
          onChange={(value) => setRangeIndex(Number(value))}
        />
      </div>
      {averaged.length === 0 ? (
        <p className="text-sm text-muted">Nothing recorded in this window.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {averaged.map((row) => (
            <BarRow
              key={row.id}
              id={row.id}
              name={row.name}
              color={row.color}
              max={max}
              bars={[{ minutes: row.average, solid: true }]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
