"use client";

import { useState } from "react";
import { formatDuration } from "@/lib/entries";
import { CategoryBadge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface SummaryHistoryChartProps {
  /** Monday keys, ascending, oldest first. */
  weeks: string[];
  recordedMinutes: number[];
  plannedMinutes: number[];
  categories: { id: string; name: string; color: string | null }[];
  /** categoryId -> weekly recorded minutes, aligned to `weeks`. */
  recordedByCategory: Record<string, number[]>;
  /** categoryId -> weekly planned minutes, aligned to `weeks`. */
  plannedByCategory: Record<string, number[]>;
  /** Total minutes per category for the currently displayed period, desc sorted. */
  categoryTotals: {
    id: string;
    name: string;
    color: string | null;
    totalMinutes: number;
  }[];
}

const WINDOW_OPTIONS = [12, 26, 52];
const RATE_COLOR = "#6fd29c";

function useWindow(length: number) {
  const [weeksBack, setWeeksBack] = useState(26);
  return { weeksBack, setWeeksBack, n: Math.min(weeksBack, length) };
}

function slice<T>(arr: T[], n: number): T[] {
  return arr.slice(Math.max(0, arr.length - n));
}

function pointsFor(
  values: number[],
  width: number,
  height: number,
  max: number,
) {
  if (values.length === 1) {
    return [`${width / 2},${height - (values[0] / max) * height}`];
  }
  return values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - (v / max) * height;
    return `${x},${y}`;
  });
}

function weekLabel(key: string): string {
  const parts = key.split("-");
  return parts.length === 3 ? `${parts[1]}/${parts[2]}` : key;
}

function ratesOf(recorded: number[], planned: number[]): (number | null)[] {
  return recorded.map((r, i) => (planned[i] > 0 ? r / planned[i] : null));
}

function WindowToggle({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-md border border-hairline text-xs">
      {WINDOW_OPTIONS.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={cn(
            "cursor-pointer px-2.5 py-1.5 transition-colors",
            value === n
              ? "bg-panel text-foreground"
              : "text-muted hover:text-foreground",
          )}
        >
          {n}w
        </button>
      ))}
    </div>
  );
}

function AxisLabels({ weeks }: { weeks: string[] }) {
  return (
    <div className="mt-1 flex justify-between text-[0.6rem] text-muted">
      <span>{weekLabel(weeks[0] ?? "")}</span>
      <span>{weekLabel(weeks[weeks.length - 1] ?? "")}</span>
    </div>
  );
}

/** Area (recorded hours) with an overlaid line (completion rate, dashed at 100%). */
function ComboChart({
  weeks,
  recordedMinutes,
  plannedMinutes,
  accentColor,
}: {
  weeks: string[];
  recordedMinutes: number[];
  plannedMinutes: number[];
  accentColor: string;
}) {
  const rate = ratesOf(recordedMinutes, plannedMinutes);

  const W = 100;
  const H = 160;
  const maxRec = Math.max(...recordedMinutes, 60);
  const recLine = pointsFor(recordedMinutes, W, H, maxRec).join(" ");
  const area = `0,${H} ${recLine} ${W},${H}`;

  const validIdx = rate
    .map((r, i) => (r === null ? -1 : i))
    .filter((i) => i >= 0);
  const maxRate = Math.max(...validIdx.map((i) => rate[i]!), 1, 1.2);
  const xAt = (i: number) =>
    weeks.length === 1 ? W / 2 : (i / (weeks.length - 1)) * W;
  const rateY = (r: number) => H - Math.min(r / maxRate, 1) * H;
  const ratePts = validIdx.map((i) => `${xAt(i)},${rateY(rate[i]!)}`);
  const hundredY = rateY(1);
  const latestRate = rate[rate.length - 1];

  return (
    <>
      <p className="mb-2 text-xs text-muted">
        Area = recorded hours · green line = completion rate (dashed = 100% of
        plan)
        {latestRate !== null && latestRate !== undefined
          ? ` · last week ${Math.round(latestRate * 100)}%`
          : ""}
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ height: H }}
        className="w-full"
        preserveAspectRatio="none"
      >
        <polygon points={area} fill={accentColor} opacity="0.15" />
        <polyline
          points={recLine}
          fill="none"
          stroke={accentColor}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={0}
          y1={hundredY}
          x2={W}
          y2={hundredY}
          stroke="var(--color-muted)"
          strokeWidth="0.5"
          strokeDasharray="2 2"
        />
        {validIdx.length > 1 ? (
          <polyline
            points={ratePts.join(" ")}
            fill="none"
            stroke={RATE_COLOR}
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
      </svg>
      <AxisLabels weeks={weeks} />
      <div className="mt-3 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: accentColor }}
          />
          Recorded hours
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: RATE_COLOR }}
          />
          Completion rate
        </span>
      </div>
    </>
  );
}

function CategoryPicker({
  categories,
  value,
  onChange,
}: {
  categories: { id: string; name: string; color: string | null }[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          "cursor-pointer rounded-sm border px-1.5 py-0.5 text-[0.7rem] font-medium transition-colors",
          value === null
            ? "border-accent-dim text-accent"
            : "border-hairline text-muted hover:text-foreground",
        )}
      >
        All categories
      </button>
      {categories.map((c) => (
        <button key={c.id} type="button" onClick={() => onChange(c.id)}>
          <CategoryBadge
            id={c.id}
            name={c.name}
            color={c.color}
            className={cn(
              "cursor-pointer transition-opacity",
              value !== null &&
                value !== c.id &&
                "opacity-40 hover:opacity-100",
            )}
          />
        </button>
      ))}
    </div>
  );
}

/** Horizontal bar chart of total recorded time per category, for the currently displayed period. */
function CategoryTotalsBars({
  rows,
}: {
  rows: {
    id: string;
    name: string;
    color: string | null;
    totalMinutes: number;
  }[];
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted">Nothing recorded in this period.</p>
    );
  }
  const max = Math.max(...rows.map((r) => r.totalMinutes));
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <div
          key={row.id}
          className="grid grid-cols-[minmax(6rem,10rem)_1fr_4rem] items-center gap-3"
        >
          <CategoryBadge
            id={row.id}
            name={row.name}
            color={row.color}
            className="justify-self-start break-words whitespace-normal"
          />
          <div className="h-3.5 rounded-sm bg-panel/40">
            <div
              className="h-full rounded-sm bg-accent/80"
              style={{
                width: `${Math.round((row.totalMinutes / max) * 100)}%`,
              }}
            />
          </div>
          <span className="text-right font-mono text-xs text-muted tabular-nums">
            {formatDuration(row.totalMinutes)}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Weekly recorded-hours + completion-rate trend, with a per-category picker,
 * plus a bar chart of total time per category for the current period.
 */
export function SummaryHistoryChart({
  weeks,
  recordedMinutes,
  plannedMinutes,
  categories,
  recordedByCategory,
  plannedByCategory,
  categoryTotals,
}: SummaryHistoryChartProps) {
  const { weeksBack, setWeeksBack, n } = useWindow(weeks.length);
  const [selected, setSelected] = useState<string | null>(null);

  const w = slice(weeks, n);
  const zeros = new Array(weeks.length).fill(0);
  const selectedCategory = categories.find((c) => c.id === selected) ?? null;
  const rec = slice(
    selected ? (recordedByCategory[selected] ?? zeros) : recordedMinutes,
    n,
  );
  const pln = slice(
    selected ? (plannedByCategory[selected] ?? zeros) : plannedMinutes,
    n,
  );
  const accentColor = selectedCategory?.color ?? "var(--color-accent)";

  return (
    <>
      <Card className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="mb-0">
            {selectedCategory
              ? `${selectedCategory.name} · weekly`
              : "Weekly hours & completion rate"}
          </CardTitle>
          <WindowToggle value={weeksBack} onChange={setWeeksBack} />
        </div>
        <div className="mb-4">
          <CategoryPicker
            categories={categories}
            value={selected}
            onChange={setSelected}
          />
        </div>
        <ComboChart
          weeks={w}
          recordedMinutes={rec}
          plannedMinutes={pln}
          accentColor={accentColor}
        />
      </Card>

      <Card className="mb-6">
        <CardTitle>Total time by category, this period</CardTitle>
        <CategoryTotalsBars rows={categoryTotals} />
      </Card>
    </>
  );
}
