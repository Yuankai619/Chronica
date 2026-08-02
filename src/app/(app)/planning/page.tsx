import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { sortCategories } from "@/lib/categories";

import { computeWeekStatus } from "@/lib/plan-board";
import {
  addDaysKey,
  dayKeyInTz,
  weekDayKeysOf,
  weekStartKeyOf,
  zonedDayStart,
} from "@/lib/tz";
import { getUserTimeZone } from "@/server/tz";
import { formatDuration } from "@/lib/entries";
import { formatSignedDuration } from "@/lib/settlement";
import { PlanBoard } from "@/components/plan-board";
import { RetroCard } from "@/components/retro-card";
import { CalendarSyncButton } from "@/components/calendar-sync-button";
import { CopyWeekButton } from "@/components/copy-week-button";
import { isGoogleLinked } from "@/server/google-calendar";
import { CategoryBadge } from "@/components/ui/badge";

export const metadata = { title: "Planning — Chronica" };

function parseWeekParam(raw: string | undefined, todayKey: string): string {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return weekStartKeyOf(raw);
  }
  return weekStartKeyOf(todayKey);
}

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const timeZone = await getUserTimeZone();
  const todayKey = dayKeyInTz(new Date(), timeZone);
  const weekKey = parseWeekParam(week, todayKey);
  const dayKeys = weekDayKeysOf(weekKey);
  const reviewWeekKey = addDaysKey(weekKey, -7);
  const reviewWeekStart = zonedDayStart(reviewWeekKey, timeZone);
  const weekStartInstant = zonedDayStart(weekKey, timeZone);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const lastWeekKeys = weekDayKeysOf(reviewWeekKey);

  const [
    { data: categories },
    { data: items },
    { data: lastWeekItems },
    { data: lastWeekEntries },
    { data: retro },
    { count: reviewEntryCount },
    gcalLinked,
  ] = await Promise.all([
    supabase.from("categories").select("*").is("archived_at", null),
    supabase
      .from("planned_items")
      .select("*")
      .gte("day", dayKeys[0])
      .lte("day", dayKeys[6]),
    supabase
      .from("planned_items")
      .select("*")
      .gte("day", lastWeekKeys[0])
      .lte("day", lastWeekKeys[6]),
    supabase
      .from("time_entries")
      .select("*")
      .gte("started_at", reviewWeekStart.toISOString())
      .lt("started_at", weekStartInstant.toISOString()),
    supabase
      .from("retros")
      .select("content")
      .eq("week_start", reviewWeekKey)
      .maybeSingle(),
    supabase
      .from("time_entries")
      .select("id", { count: "exact", head: true })
      .gte("started_at", reviewWeekStart.toISOString())
      .lt("started_at", weekStartInstant.toISOString()),
    isGoogleLinked(supabase, user!.id),
  ]);

  const sorted = sortCategories(categories ?? []);
  const status = computeWeekStatus(
    sorted,
    lastWeekItems ?? [],
    lastWeekEntries ?? [],
  );

  return (
    <main>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">
          Plan · week of{" "}
          <span className="font-mono tabular-nums">{weekKey}</span>
        </h1>
        <nav className="flex items-center gap-3 text-sm">
          <CopyWeekButton weekKey={weekKey} />
          {gcalLinked ? <CalendarSyncButton weekKey={weekKey} /> : null}
          <Link
            className="text-muted hover:text-foreground"
            href={`/planning?week=${addDaysKey(weekKey, -7)}`}
          >
            ← Prev
          </Link>
          <Link className="text-muted hover:text-foreground" href="/planning">
            This week
          </Link>
          <Link
            className="text-muted hover:text-foreground"
            href={`/planning?week=${addDaysKey(weekKey, 7)}`}
          >
            Next →
          </Link>
        </nav>
      </div>

      {status.length > 0 ? (
        <div className="mb-6">
          <p className="microlabel mb-2">
            Last week ({reviewWeekKey}) · actual / planned
          </p>
          <div className="flex flex-wrap gap-2">
            {status.map((row) => (
              <div
                key={row.category.id}
                className="flex items-center gap-2 rounded-md border border-hairline px-2.5 py-1.5 text-sm"
              >
                <CategoryBadge
                  id={row.category.id}
                  name={row.category.name}
                  color={row.category.color}
                />
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
        </div>
      ) : null}

      <div className="mb-8">
        <PlanBoard
          dayKeys={dayKeys}
          todayKey={todayKey}
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
