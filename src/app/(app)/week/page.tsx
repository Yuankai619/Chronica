import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

import { computeWeekSettlement } from "@/lib/settlement";
import { formatDuration } from "@/lib/entries";
import { plannedByCategory, plannedByDay } from "@/lib/plan-board";
import {
  addDaysKey,
  dayKeyInTz,
  weekDayKeysOf,
  weekStartKeyOf,
  zonedDayStart,
} from "@/lib/tz";
import { getUserTimeZone } from "@/server/tz";
import { weekDayGaps } from "@/lib/unrecorded";
import { SettlementTable } from "@/components/settlement-table";
import { DayGaps } from "@/components/day-gaps";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Week — Chronica" };

function parseWeekParam(raw: string | undefined, todayKey: string): string {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return weekStartKeyOf(raw);
  }
  return weekStartKeyOf(todayKey);
}

export default async function WeekPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const timeZone = await getUserTimeZone();
  const todayKey = dayKeyInTz(new Date(), timeZone);
  const weekKey = parseWeekParam(week, todayKey);
  const dayKeys = weekDayKeysOf(weekKey);
  const weekStart = zonedDayStart(weekKey, timeZone);
  const weekEnd = zonedDayStart(addDaysKey(weekKey, 7), timeZone);
  const isCurrentWeek = weekKey === weekStartKeyOf(todayKey);

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
            href={`/week?week=${addDaysKey(weekKey, -7)}`}
          >
            ← Prev
          </Link>
          <Link className="text-muted hover:text-foreground" href="/week">
            This week
          </Link>
          <Link
            className="text-muted hover:text-foreground"
            href={`/week?week=${addDaysKey(weekKey, 7)}`}
          >
            Next →
          </Link>
        </nav>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <Card>
          <p className="microlabel mb-1">Recorded</p>
          <p className="font-mono text-2xl font-semibold tabular-nums">
            {formatDuration(settlement.totalActualMinutes)}
          </p>
        </Card>
        <Card>
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
            weekKey,
            entries ?? [],
            plannedByDay(items ?? []),
            timeZone,
          )}
        />
      </div>
    </main>
  );
}
