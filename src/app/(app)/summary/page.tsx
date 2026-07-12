import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_GROUP_LABELS, CATEGORY_GROUPS } from "@/lib/categories";
import { formatDuration } from "@/lib/entries";
import { monthlyEffectiveTrend, summarizePeriod } from "@/lib/summary";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

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
  searchParams: Promise<{ period?: string }>;
}) {
  const { period } = await searchParams;
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

  const supabase = await createClient();
  const [{ data: categories }, { data: entries }] = await Promise.all([
    supabase.from("categories").select("*"),
    supabase
      .from("time_entries")
      .select("*")
      .gte("started_at", start.toISOString())
      .lt("started_at", end.toISOString())
      .limit(10000),
  ]);

  const summary = summarizePeriod(categories ?? [], entries ?? []);
  const trend =
    mode === "year"
      ? monthlyEffectiveTrend(categories ?? [], entries ?? [])
      : null;
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

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <p className="microlabel mb-1">Recorded</p>
          <p className="font-mono text-xl font-semibold tabular-nums">
            {formatDuration(summary.totalMinutes)}
          </p>
        </Card>
        <Card>
          <p className="microlabel mb-1">Effective work</p>
          <p className="font-mono text-xl font-semibold text-accent tabular-nums">
            {formatDuration(summary.effectiveWorkMinutes)}
          </p>
        </Card>
        <Card>
          <p className="microlabel mb-1">Entries</p>
          <p className="font-mono text-xl font-semibold tabular-nums">
            {summary.entryCount}
          </p>
        </Card>
        <Card>
          <p className="microlabel mb-1">Rest</p>
          <p className="font-mono text-xl font-semibold tabular-nums">
            {formatDuration(summary.groupTotals.rest)}
          </p>
        </Card>
      </div>

      {trend ? (
        <div className="mb-8">
          <h2 className="microlabel mb-2">Effective work by month</h2>
          <div className="grid grid-cols-12 items-end gap-1.5">
            {trend.map((minutes, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="flex h-20 w-full items-end rounded-sm border border-hairline bg-panel/40">
                  <div
                    className="w-full rounded-sm bg-accent/80"
                    style={{
                      height: `${Math.round((minutes / trendMax) * 100)}%`,
                    }}
                    title={`${MONTHS[i]}: ${formatDuration(minutes)}`}
                  />
                </div>
                <span className="microlabel">{MONTHS[i]}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CATEGORY_GROUPS.map((group) => (
          <div
            key={group}
            className="flex items-center justify-between rounded-md border border-hairline px-3 py-2"
          >
            <Badge variant={group}>{CATEGORY_GROUP_LABELS[group]}</Badge>
            <span className="font-mono text-sm tabular-nums">
              {formatDuration(summary.groupTotals[group])}
            </span>
          </div>
        ))}
      </div>

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
                  <span className="mr-2 font-medium">{row.category.name}</span>
                  <Badge variant={row.category.category_group}>
                    {CATEGORY_GROUP_LABELS[row.category.category_group]}
                  </Badge>
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
