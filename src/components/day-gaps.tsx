import type { DayGap } from "@/lib/unrecorded";
import { formatDuration } from "@/lib/entries";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Recorded-vs-planned bars for the 7 days of a week. */
export function DayGaps({ gaps }: { gaps: DayGap[] }) {
  const max = Math.max(
    ...gaps.map((g) => Math.max(g.recordedMinutes, g.plannedMinutes)),
    60,
  );

  return (
    <div>
      <h2 className="microlabel mb-2">Recorded vs planned per day</h2>
      <div className="grid grid-cols-7 gap-2">
        {gaps.map((gap, i) => (
          <div key={gap.day} className="flex flex-col items-center gap-1">
            <div className="flex h-24 w-full items-end gap-0.5 rounded-sm border border-hairline bg-panel/40 px-0.5 pt-0.5">
              <div
                className="w-1/2 rounded-sm border border-accent-dim bg-transparent"
                style={{
                  height: `${Math.round((gap.plannedMinutes / max) * 100)}%`,
                }}
                aria-label={`Planned ${formatDuration(gap.plannedMinutes)}`}
              />
              <div
                className="w-1/2 rounded-sm bg-accent/80"
                style={{
                  height: `${Math.round((gap.recordedMinutes / max) * 100)}%`,
                }}
                aria-label={`Recorded ${formatDuration(gap.recordedMinutes)}`}
              />
            </div>
            <span className="microlabel">{DAY_LABELS[i]}</span>
            <span className="font-mono text-xs text-muted tabular-nums">
              {gap.recordedMinutes > 0
                ? formatDuration(gap.recordedMinutes)
                : "·"}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">
        Outlined bar = planned · solid bar = recorded
      </p>
    </div>
  );
}
