import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { sortCategories } from "@/lib/categories";
import { getWeekEnd, getWeekKey, getWeekStart } from "@/lib/week";
import { computeWeekStatus, weekDayKeys } from "@/lib/plan-board";
import { dayKey } from "@/lib/unrecorded";
import { formatDuration } from "@/lib/entries";
import { formatSignedDuration } from "@/lib/settlement";
import { PlanBoard } from "@/components/plan-board";
import { RetroCard } from "@/components/retro-card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Planning — Chronica" };

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

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const weekStart = parseWeekParam(week);
  const weekEnd = getWeekEnd(weekStart);
  const weekKey = getWeekKey(weekStart);
  const dayKeys = weekDayKeys(weekStart);
  const reviewWeekKey = shiftWeek(weekStart, -1);
  const reviewWeekStart = new Date(`${reviewWeekKey}T00:00:00`);

  const supabase = await createClient();

  const [
    { data: categories },
    { data: items },
    { data: entries },
    { data: retro },
    { count: reviewEntryCount },
  ] = await Promise.all([
    supabase.from("categories").select("*").is("archived_at", null),
    supabase
      .from("planned_items")
      .select("*")
      .gte("day", dayKeys[0])
      .lte("day", dayKeys[6]),
    supabase
      .from("time_entries")
      .select("*")
      .gte("started_at", weekStart.toISOString())
      .lt("started_at", weekEnd.toISOString()),
    supabase
      .from("retros")
      .select("content")
      .eq("week_start", reviewWeekKey)
      .maybeSingle(),
    supabase
      .from("time_entries")
      .select("id", { count: "exact", head: true })
      .gte("started_at", reviewWeekStart.toISOString())
      .lt("started_at", weekStart.toISOString()),
  ]);

  const sorted = sortCategories(categories ?? []);
  const status = computeWeekStatus(sorted, items ?? [], entries ?? []);

  return (
    <main>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">
          Plan · week of{" "}
          <span className="font-mono tabular-nums">{weekKey}</span>
        </h1>
        <nav className="flex gap-3 text-sm">
          <Link
            className="text-muted hover:text-foreground"
            href={`/planning?week=${shiftWeek(weekStart, -1)}`}
          >
            ← Prev
          </Link>
          <Link className="text-muted hover:text-foreground" href="/planning">
            This week
          </Link>
          <Link
            className="text-muted hover:text-foreground"
            href={`/planning?week=${shiftWeek(weekStart, 1)}`}
          >
            Next →
          </Link>
        </nav>
      </div>

      {status.length > 0 ? (
        <div className="mb-6 flex flex-wrap gap-2">
          {status.map((row) => (
            <div
              key={row.category.id}
              className="flex items-center gap-2 rounded-md border border-hairline px-2.5 py-1.5 text-sm"
            >
              <Badge variant={row.category.category_group}>
                {row.category.name}
              </Badge>
              <span className="font-mono text-xs text-muted tabular-nums">
                {formatDuration(row.actualMinutes)} /{" "}
                {formatDuration(row.plannedMinutes)}
              </span>
              <span
                className={`font-mono text-xs tabular-nums ${
                  row.diffMinutes > 0
                    ? "text-danger"
                    : row.diffMinutes < 0
                      ? "text-accent"
                      : "text-muted"
                }`}
              >
                {formatSignedDuration(row.diffMinutes)}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mb-8">
        <PlanBoard
          dayKeys={dayKeys}
          todayKey={dayKey(new Date())}
          items={items ?? []}
          categories={sorted}
        />
      </div>

      <RetroCard
        reviewWeekKey={reviewWeekKey}
        initialContent={retro?.content ?? null}
        disabled={(reviewEntryCount ?? 0) === 0}
      />
    </main>
  );
}
