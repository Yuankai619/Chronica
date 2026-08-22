import { createClient } from "@/lib/supabase/server";
import { excludedCategoryIds } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/entries";
import {
  bucketPlannedMinutesByWeek,
  bucketRecordedMinutesByWeek,
  summarizePeriod,
  weeklyHistoryWeeks,
} from "@/lib/summary";
import { CategoryBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { dayKeyInTz, weekStartKeyOf, zonedDayStart } from "@/lib/tz";
import { getUserTimeZone } from "@/server/tz";
import { SummaryHistoryChart } from "@/components/summary-history-chart";
import Link from "next/link";
import { PageContainer } from "@/components/ui/page-container";

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

function parsePeriod(
  raw: string | undefined,
  todayKey: string,
): {
  mode: "month" | "year";
  year: number;
  month: number; // 0-based, only for month mode
} {
  if (raw && /^\d{4}$/.test(raw)) {
    return { mode: "year", year: Number(raw), month: 0 };
  }
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [y, m] = raw.split("-").map(Number);
    if (m >= 1 && m <= 12) return { mode: "month", year: y, month: m - 1 };
  }
  return {
    mode: "month",
    year: Number(todayKey.slice(0, 4)),
    month: Number(todayKey.slice(5, 7)) - 1,
  };
}

export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period } = await searchParams;
  const timeZone = await getUserTimeZone();
  const todayKey = dayKeyInTz(new Date(), timeZone);
  const { mode, year, month } = parsePeriod(period, todayKey);

  const pad = (n: number) => String(n).padStart(2, "0");
  const startKey =
    mode === "year" ? `${year}-01-01` : `${year}-${pad(month + 1)}-01`;
  const endKey =
    mode === "year"
      ? `${year + 1}-01-01`
      : month === 11
        ? `${year + 1}-01-01`
        : `${year}-${pad(month + 2)}-01`;
  const start = zonedDayStart(startKey, timeZone);
  const end = zonedDayStart(endKey, timeZone);
  const label = mode === "year" ? String(year) : `${MONTHS[month]} ${year}`;

  const prev =
    mode === "year"
      ? String(year - 1)
      : `${month === 0 ? year - 1 : year}-${String(month === 0 ? 12 : month).padStart(2, "0")}`;
  const next =
    mode === "year"
      ? String(year + 1)
      : `${month === 11 ? year + 1 : year}-${String(month === 11 ? 1 : month + 2).padStart(2, "0")}`;

  const yearAgo = new Date();
  yearAgo.setDate(yearAgo.getDate() - 365);
  const yearAgoKey = dayKeyInTz(yearAgo, timeZone);
  const currentWeekKey = weekStartKeyOf(todayKey);

  const supabase = await createClient();
  const [
    { data: categories },
    { data: entries },
    { data: yearEntries },
    { data: yearPlannedItems },
  ] = await Promise.all([
    supabase.from("categories").select("*"),
    supabase
      .from("time_entries")
      .select("*")
      .gte("started_at", start.toISOString())
      .lt("started_at", end.toISOString())
      .is("deleted_at", null)
      .limit(10000),
    supabase
      .from("time_entries")
      .select("category_id, duration_minutes, started_at")
      .gte("started_at", yearAgo.toISOString())
      .is("deleted_at", null)
      .limit(10000),
    supabase
      .from("planned_items")
      .select("day, expected_minutes, category_id")
      .gte("day", yearAgoKey)
      .lte("day", todayKey)
      .limit(20000),
  ]);

  const summary = summarizePeriod(categories ?? [], entries ?? []);
  const excluded = excludedCategoryIds(categories ?? []);

  // Weekly history: total recorded/planned minutes per week, plus the same
  // buckets split per category, from a year ago through the current week.
  const historyWeeks = weeklyHistoryWeeks(yearAgoKey, currentWeekKey);
  const recorded = bucketRecordedMinutesByWeek(
    yearEntries ?? [],
    historyWeeks,
    timeZone,
    excluded,
  );
  const planned = bucketPlannedMinutesByWeek(
    yearPlannedItems ?? [],
    historyWeeks,
  );
  const historyCategories = (categories ?? [])
    .filter((c) => recorded.byCategory[c.id] || planned.byCategory[c.id])
    .map((c) => ({ id: c.id, name: c.name, color: c.color }));

  const categoryTotals = summary.categories
    .map((row) => ({
      id: row.category.id,
      name: row.category.name,
      color: row.category.color,
      totalMinutes: row.totalMinutes,
    }))
    .filter((row) => row.totalMinutes > 0)
    .toSorted((a, b) => b.totalMinutes - a.totalMinutes);

  return (
    <PageContainer>
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
              <Link
                className="text-muted hover:text-foreground"
                href="/summary"
              >
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
            {summary.excludedMinutes > 0 ? (
              <p className="mt-1 text-xs text-muted">
                + {formatDuration(summary.excludedMinutes)} not counted
              </p>
            ) : null}
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

        <SummaryHistoryChart
          weeks={historyWeeks}
          recordedMinutes={recorded.total}
          plannedMinutes={planned.total}
          categories={historyCategories}
          recordedByCategory={recorded.byCategory}
          plannedByCategory={planned.byCategory}
          categoryTotals={categoryTotals}
        />

        {summary.categories.length === 0 ? (
          <p className="text-sm text-muted">Nothing recorded in this period.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left">
                <th className="microlabel py-2 font-normal">Category</th>
                <th className="microlabel py-2 text-right font-normal">
                  Total
                </th>
                <th className="microlabel py-2 text-right font-normal">
                  Sessions
                </th>
              </tr>
            </thead>
            <tbody>
              {summary.categories.map((row) => (
                <tr
                  key={row.category.id}
                  className={cn(
                    "border-b border-hairline",
                    row.category.excluded_from_totals && "opacity-70",
                  )}
                  title={
                    row.category.excluded_from_totals
                      ? "Not counted toward the total"
                      : undefined
                  }
                  aria-label={
                    row.category.excluded_from_totals
                      ? `${row.category.name}, not counted toward the total`
                      : undefined
                  }
                >
                  <td className="py-2.5">
                    <CategoryBadge
                      id={row.category.id}
                      name={row.category.name}
                      color={row.category.color}
                    />
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums">
                    {formatDuration(row.totalMinutes)}
                  </td>
                  <td
                    className={cn(
                      "py-2.5 text-right font-mono tabular-nums",
                      // The row is already dimmed; muting on top would stack.
                      row.category.excluded_from_totals ? "" : "text-muted",
                    )}
                  >
                    {row.entryCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </PageContainer>
  );
}
