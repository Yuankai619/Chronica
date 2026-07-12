import type { DayGap } from "@/lib/unrecorded";
import { formatDuration } from "@/lib/entries";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Recorded-vs-target bars for the 7 days of a week. */
export function DayGaps({
  gaps,
  targetMinutes,
}: {
  gaps: DayGap[];
  targetMinutes: number;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="microlabel">
          Recorded vs {formatDuration(targetMinutes)} target
        </h2>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {gaps.map((gap, i) => {
          const ratio =
            targetMinutes === 0
              ? 1
              : Math.min(1, gap.recordedMinutes / targetMinutes);
          return (
            <div key={gap.day} className="flex flex-col items-center gap-1">
              <div className="flex h-24 w-full items-end rounded-sm border border-hairline bg-panel/40">
                <div
                  className="w-full rounded-sm bg-accent/80"
                  style={{ height: `${Math.round(ratio * 100)}%` }}
                  title={`${gap.day}: ${formatDuration(gap.recordedMinutes)} recorded, ${formatDuration(gap.unrecordedMinutes)} unrecorded`}
                />
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
    </div>
  );
}
