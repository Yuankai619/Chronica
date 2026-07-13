import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getWeekEnd, getWeekKey, getWeekStart } from "@/lib/week";
import { computeWeekSettlement } from "@/lib/settlement";
import { formatDuration } from "@/lib/entries";
import { plannedByCategory, plannedByDay, weekDayKeys } from "@/lib/plan-board";
import { weekDayGaps } from "@/lib/unrecorded";
import { SettlementTable } from "@/components/settlement-table";
import { DayGaps } from "@/components/day-gaps";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Week — Chronica" };

function parseWeekParam(raw: string | undefined): Date {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const parsed = new Date(`${raw}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) return getWeekStart(parsed);
  }
  return getWeekStart(new Date());
}

function shiftWeek(weekStart: Date, weeks: number): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + weeks * 7);
  return getWeekKey(d);
}

export default async function WeekPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const weekStart = parseWeekParam(week);
  const weekEnd = getWeekEnd(weekStart);
  const weekKey = getWeekKey(weekStart);
  const dayKeys = weekDayKeys(weekStart);
  const isCurrentWeek = weekKey === getWeekKey(new Date());

  const supabase = await createClient();

  const [{ data: categories }, { data: entries }, { data: items }] =
    await Promise.all([
      supabase.from("categories").select("*"),
      supabase
        .from("time_entries")
        .select("*")
        .gte("started_at", weekStart.toISOString())
        .lt("started_at", weekEnd.toISOString()),
      supabase
        .from("planned_items")
        .select("*")
        .gte("day", dayKeys[0])
        .lte("day", dayKeys[6]),
    ]);

  const settlement = computeWeekSettlement(
    categories ?? [],
    entries ?? [],
    plannedByCategory(items ?? []),
  );

  return (
    <main>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          Week of <span className="font-mono tabular-nums">{weekKey}</span>
          {isCurrentWeek ? (
            <span className="microlabel ml-3 text-accent">live</span>
          ) : null}
        </h1>
        <nav className="flex gap-3 text-sm">
          <Link
            className="text-muted hover:text-foreground"
            href={`/week?week=${shiftWeek(weekStart, -1)}`}
          >
            ← Prev
          </Link>
          <Link className="text-muted hover:text-foreground" href="/week">
            This week
          </Link>
          <Link
            className="text-muted hover:text-foreground"
            href={`/week?week=${shiftWeek(weekStart, 1)}`}
          >
            Next →
          </Link>
        </nav>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card>
          <p className="microlabel mb-1">Recorded</p>
          <p className="font-mono text-2xl font-semibold tabular-nums">
            {formatDuration(settlement.totalActualMinutes)}
          </p>
        </Card>
        <Card>
          <p className="microlabel mb-1">Effective work</p>
          <p className="font-mono text-2xl font-semibold text-accent tabular-nums">
            {formatDuration(settlement.effectiveWorkMinutes)}
          </p>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <p className="microlabel mb-1">Planned</p>
          <p className="font-mono text-2xl font-semibold tabular-nums">
            {settlement.totalPlannedMinutes === null
              ? "—"
              : formatDuration(settlement.totalPlannedMinutes)}
          </p>
        </Card>
      </div>

      {!settlement.hasPlan ? (
        <p className="mb-4 text-sm text-muted">
          Nothing planned this week — actuals only, no over/under.
        </p>
      ) : null}

      <SettlementTable settlement={settlement} />

      <div className="mt-10">
        <DayGaps
          gaps={weekDayGaps(
            weekStart,
            entries ?? [],
            plannedByDay(items ?? []),
          )}
        />
      </div>
    </main>
  );
}
