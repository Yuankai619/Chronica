"use client";

import * as React from "react";

import { categoryColor, type Category } from "@/lib/categories";
import type { DayGap } from "@/lib/unrecorded";
import { formatDuration } from "@/lib/entries";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Recorded-vs-planned bars for the 7 days of a week. */
export function DayGaps({
  gaps,
  categories,
}: {
  gaps: DayGap[];
  categories: Category[];
}) {
  // Hover alone would leave touch devices no way to read the colors.
  const [openKey, setOpenKey] = React.useState<string | null>(null);

  const byId = new Map(categories.map((c) => [c.id, c]));
  const max = Math.max(
    ...gaps.map((g) => Math.max(g.recordedMinutes, g.plannedMinutes)),
    60,
  );

  return (
    <div>
      <h2 className="microlabel mb-2">Recorded vs planned per day</h2>
      <div className="grid grid-cols-7 gap-2">
        {gaps.map((gap, i) => {
          const open = gap.segments.find(
            (s) => `${gap.day}:${s.categoryId}` === openKey,
          );
          return (
            <div key={gap.day} className="flex flex-col items-center gap-1">
              <div className="relative flex h-44 w-full items-end gap-0.5 rounded-sm border border-hairline bg-panel/40 px-0.5 pt-0.5">
                <div
                  className="bar-planned w-1/2 rounded-sm"
                  style={{
                    height: `${Math.round((gap.plannedMinutes / max) * 100)}%`,
                  }}
                  aria-label={`Planned ${formatDuration(gap.plannedMinutes)}`}
                />
                <div
                  className="flex w-1/2 flex-col-reverse overflow-hidden rounded-sm"
                  style={{
                    height: `${Math.round((gap.recordedMinutes / max) * 100)}%`,
                  }}
                >
                  {gap.segments.map((segment) => {
                    const category = byId.get(segment.categoryId);
                    const key = `${gap.day}:${segment.categoryId}`;
                    return (
                      <button
                        key={key}
                        type="button"
                        className="w-full"
                        style={{
                          height: `${(segment.minutes / gap.recordedMinutes) * 100}%`,
                          backgroundColor: category
                            ? categoryColor(category)
                            : "var(--color-hairline)",
                        }}
                        aria-label={`${category?.name ?? "Unknown"} ${formatDuration(segment.minutes)}`}
                        onPointerEnter={() => setOpenKey(key)}
                        onPointerLeave={() =>
                          setOpenKey((c) => (c === key ? null : c))
                        }
                        onClick={() =>
                          setOpenKey((c) => (c === key ? null : key))
                        }
                      />
                    );
                  })}
                </div>
                {open ? (
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded-sm border border-hairline bg-panel px-1.5 py-0.5 text-[0.7rem] whitespace-nowrap">
                    {byId.get(open.categoryId)?.name ?? "Unknown"}
                  </span>
                ) : null}
              </div>
              <span className="microlabel">{DAY_LABELS[i]}</span>
              <span className="font-mono text-xs text-muted tabular-nums">
                {gap.recordedMinutes > 0
                  ? formatDuration(gap.recordedMinutes)
                  : "·"}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted">
        Hatched bar = planned · colored bar = recorded, split by category
      </p>
    </div>
  );
}
