import { createClient } from "@/lib/supabase/server";
import { formatDuration } from "@/lib/entries";
import { monthlyRecordedTrend, summarizePeriod } from "@/lib/summary";
import { CategoryBadge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { getWeekEnd, getWeekKey, getWeekStart } from "@/lib/week";
import { plannedByCategory } from "@/lib/plan-board";
import { actualsByCategory } from "@/lib/settlement";
import {
  CategoryAverageChart,
  WeekCompareChart,
  type RangeRow,
  type WeekCompareRow,
} from "@/components/summary-charts";
import Link from "next/link";

export const metadata = { title: "Summary — Chronica" };

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function parsePeriod(raw: string | undefined): {
  mode: "month" | "year";
  year: number;
  month: number; // 0-based, only for month mode
} {
  const now = new Date();
  if (raw && /^\d{4}$/.test(raw)) {
    return { mode: "year", year: Number(raw), month: 0 };
  }
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [y, m] = raw.split("-").map(Number);
    if (m >= 1 && m <= 12) return { mode: "month", year: y, month: m - 1 };
  }
  return { mode: "month", year: now.getFullYear(), month: now.getMonth() };
}

export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; week?: string }>;
}) {
  const { period, week } = await searchParams;
  const { mode, year, month } = parsePeriod(period);

  const start =
    mode === "year" ? new Date(year, 0, 1) : new Date(year, month, 1);
  const end =
    mode === "year" ? new Date(year + 1, 0, 1) : new Date(year, month + 1, 1);
  const label = mode === "year" ? String(year) : `${MONTHS[month]} ${year}`;

  const prev =
    mode === "year"
      ? String(year - 1)
      : `${month === 0 ? year - 1 : year}-${String(month === 0 ? 12 : month).padStart(2, "0")}`;
  const next =
    mode === "year"
      ? String(year + 1)
      : `${month === 11 ? year + 1 : year}-${String(month === 11 ? 1 : month + 2).padStart(2, "0")}`;

  const weekStart =
    week && /^\d{4}-\d{2}-\d{2}$/.test(week)
      ? getWeekStart(new Date(`${week}T00:00:00`))
      : getWeekStart(new Date());
  const weekEnd = getWeekEnd(weekStart);
  const weekKey = getWeekKey(weekStart);
  const weekEndKey = getWeekKey(new Date(weekEnd.getTime() - 1));
  const yearAgo = new Date();
  yearAgo.setDate(yearAgo.getDate() - 365);

  const supabase = await createClient();
  const [
    { data: categories },
    { data: entries },
    { data: weekEntries },
    { data: weekItems },
    { data: yearEntries },
  ] = await Promise.all([
    supabase.from("categories").select("*"),
    supabase
      .from("time_entries")
      .select("*")
      .gte("started_at", start.toISOString())
      .lt("started_at", end.toISOString())
      .limit(10000),
    supabase
      .from("time_entries")
      .select("*")
      .gte("started_at", weekStart.toISOString())
      .lt("started_at", weekEnd.toISOString()),
    supabase
      .from("planned_items")
      .select("*")
      .gte("day", weekKey)
      .lte("day", weekEndKey),
    supabase
      .from("time_entries")
      .select("category_id, duration_minutes, started_at")
      .gte("started_at", yearAgo.toISOString())
      .limit(10000),
  ]);

  const weekPlanned = plannedByCategory(weekItems ?? []);
  const weekActual = actualsByCategory(
    (weekEntries ?? []) as Parameters<typeof actualsByCategory>[0],
  );
  const compareRows: WeekCompareRow[] = (categories ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    plannedMinutes: weekPlanned.get(c.id) ?? 0,
    actualMinutes: weekActual.get(c.id) ?? 0,
  }));

  const nowMs = yearAgo.getTime() + 365 * 86_400_000;
  const rangeDays = [30, 90, 180, 365];
  const rangeTotals = new Map<string, [number, number, number, number]>();
  for (const e of yearEntries ?? []) {
    const ageDays = (nowMs - Date.parse(e.started_at)) / 86_400_000;
    let totals = rangeTotals.get(e.category_id);
    if (!totals) {
      totals = [0, 0, 0, 0];
      rangeTotals.set(e.category_id, totals);
    }
    for (const [i, days] of rangeDays.entries()) {
      if (ageDays <= days) totals[i] += e.duration_minutes;
    }
  }
  const rangeRows: RangeRow[] = (categories ?? [])
    .filter((c) => rangeTotals.has(c.id))
    .map((c) => ({
      id: c.id,
      name: c.name,
      totals: rangeTotals.get(c.id)!,
    }));

  function shiftWeek(weeks: number): string {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + weeks * 7);
    return getWeekKey(d);
  }

  const summary = summarizePeriod(categories ?? [], entries ?? []);
  const trend = mode === "year" ? monthlyRecordedTrend(entries ?? []) : null;
  const trendMax = trend ? Math.max(...trend, 1) : 1;

  return (
    <main>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">
          Summary · <span className="font-mono">{label}</span>
        </h1>
        <nav className="flex gap-3 text-sm">
          <Link
            className="text-muted hover:text-foreground"
            href={`/summary?period=${prev}`}
          >
            ← Prev
          </Link>
          {mode === "month" ? (
            <Link
              className="text-muted hover:text-foreground"
              href={`/summary?period=${year}`}
            >
              Year view
            </Link>
          ) : (
            <Link className="text-muted hover:text-foreground" href="/summary">
              Month view
            </Link>
          )}
          <Link
            className="text-muted hover:text-foreground"
            href={`/summary?period=${next}`}
          >
            Next →
          </Link>
        </nav>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Card>
          <p className="microlabel mb-1">Recorded</p>
          <p className="font-mono text-xl font-semibold tabular-nums">
            {formatDuration(summary.totalMinutes)}
          </p>
        </Card>
        <Card>
          <p className="microlabel mb-1">Entries</p>
          <p className="font-mono text-xl font-semibold tabular-nums">
            {summary.entryCount}
          </p>
        </Card>
        <Card>
          <p className="microlabel mb-1">Categories</p>
          <p className="font-mono text-xl font-semibold tabular-nums">
            {summary.categories.length}
          </p>
        </Card>
      </div>

      {trend ? (
        <div className="mb-8">
          <h2 className="microlabel mb-2">Recorded time by month</h2>
          <div className="grid grid-cols-12 items-end gap-1.5">
            {trend.map((minutes, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="flex h-20 w-full items-end rounded-sm border border-hairline bg-panel/40">
                  <div
                    className="w-full rounded-sm bg-accent/80"
                    style={{
                      height: `${Math.round((minutes / trendMax) * 100)}%`,
                    }}
                    aria-label={`${MONTHS[i]}: ${formatDuration(minutes)}`}
                  />
                </div>
                <span className="microlabel">{MONTHS[i]}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="mb-0">
            Planned vs actual · week of {weekKey}
          </CardTitle>
          <nav className="flex gap-3 text-xs">
            <Link
              className="text-muted hover:text-foreground"
              href={`/summary?period=${period ?? ""}&week=${shiftWeek(-1)}`}
            >
              ← Prev week
            </Link>
            <Link
              className="text-muted hover:text-foreground"
              href={`/summary?period=${period ?? ""}&week=${shiftWeek(1)}`}
            >
              Next week →
            </Link>
          </nav>
        </div>
        <div className="mt-4">
          <WeekCompareChart rows={compareRows} />
        </div>
      </Card>

      <Card className="mb-6">
        <CardTitle>Average weekly time per category</CardTitle>
        <CategoryAverageChart rows={rangeRows} />
      </Card>

      {summary.categories.length === 0 ? (
        <p className="text-sm text-muted">Nothing recorded in this period.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left">
              <th className="microlabel py-2 font-normal">Category</th>
              <th className="microlabel py-2 text-right font-normal">Total</th>
              <th className="microlabel py-2 text-right font-normal">
                Sessions
              </th>
            </tr>
          </thead>
          <tbody>
            {summary.categories.map((row) => (
              <tr key={row.category.id} className="border-b border-hairline">
                <td className="py-2.5">
                  <CategoryBadge
                    id={row.category.id}
                    name={row.category.name}
                  />
                </td>
                <td className="py-2.5 text-right font-mono tabular-nums">
                  {formatDuration(row.totalMinutes)}
                </td>
                <td className="py-2.5 text-right font-mono text-muted tabular-nums">
                  {row.entryCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
