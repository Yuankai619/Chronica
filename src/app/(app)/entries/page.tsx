import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { sortCategories, type Category } from "@/lib/categories";
import { EntryList, QuickAddCard } from "@/components/entries-manager";
import { getOpenTasks } from "@/server/microsoft";
import { getUserTimeZone } from "@/server/tz";
import {
  addDaysKey,
  dayKeyInTz,
  parseWeekParam,
  weekStartKeyOf,
  zonedDayStart,
} from "@/lib/tz";
import type { PickerSections } from "@/lib/tasks";
import { sortTasksForPicker } from "@/lib/tasks";

export const metadata = { title: "Entries — Chronica" };

async function WeekEntries({
  weekKey,
  timeZone,
  todayKey,
  categories,
  taskSections,
}: {
  weekKey: string;
  timeZone: string;
  todayKey: string;
  categories: Category[];
  taskSections: PickerSections | null;
}) {
  const supabase = await createClient();
  const weekStart = zonedDayStart(weekKey, timeZone);
  const weekEnd = zonedDayStart(addDaysKey(weekKey, 7), timeZone);

  // No row cap: the week bounds are the limit, and a silent truncation
  // would drop recorded time without saying so.
  const { data: entries, error } = await supabase
    .from("time_entries")
    .select("*")
    .gte("started_at", weekStart.toISOString())
    .lt("started_at", weekEnd.toISOString())
    .is("deleted_at", null)
    .order("started_at", { ascending: false });

  if (error) {
    return (
      <p className="text-sm text-danger">Failed to load: {error.message}</p>
    );
  }

  return (
    <EntryList
      categories={categories}
      entries={entries ?? []}
      taskSections={taskSections}
      timeZone={timeZone}
      todayKey={todayKey}
    />
  );
}

function EntryListSkeleton() {
  return (
    <div aria-busy className="flex animate-pulse flex-col gap-6">
      {[0, 1].map((i) => (
        <div key={i}>
          <div className="h-3 w-24 rounded-sm bg-panel" />
          <div className="mt-2 h-14 rounded-md bg-panel/50" />
          <div className="mt-1 h-14 rounded-md bg-panel/50" />
        </div>
      ))}
    </div>
  );
}

export default async function EntriesPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const timeZone = await getUserTimeZone();
  const todayKey = dayKeyInTz(new Date(), timeZone);
  const weekKey = parseWeekParam(week, todayKey);
  const isCurrentWeek = weekKey === weekStartKeyOf(todayKey);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: categories }, tasks] = await Promise.all([
    supabase.from("categories").select("*"),
    getOpenTasks(supabase, user!.id),
  ]);

  const sorted = sortCategories(categories ?? []);
  const taskSections = sortTasksForPicker(tasks.tasks, todayKey);
  const navLink = "text-muted hover:text-foreground";

  return (
    <main>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">
          Entries · <span className="font-mono tabular-nums">{weekKey}</span>
        </h1>
        <nav className="flex gap-3 text-sm">
          <Link
            className={navLink}
            href={`/entries?week=${addDaysKey(weekKey, -7)}`}
          >
            ← Prev
          </Link>
          <Link className={navLink} href="/entries">
            This week
          </Link>
          {isCurrentWeek ? (
            <span aria-hidden className="text-muted/40">
              Next →
            </span>
          ) : (
            <Link
              className={navLink}
              href={`/entries?week=${addDaysKey(weekKey, 7)}`}
            >
              Next →
            </Link>
          )}
          <Link className={navLink} href="/entries/deleted">
            Deleted
          </Link>
        </nav>
      </div>

      {isCurrentWeek ? (
        <div className="mb-6">
          <QuickAddCard
            categories={sorted}
            taskSections={taskSections}
            todayKey={todayKey}
          />
        </div>
      ) : null}

      <Suspense key={weekKey} fallback={<EntryListSkeleton />}>
        <WeekEntries
          weekKey={weekKey}
          timeZone={timeZone}
          todayKey={todayKey}
          categories={sorted}
          taskSections={taskSections}
        />
      </Suspense>
    </main>
  );
}
