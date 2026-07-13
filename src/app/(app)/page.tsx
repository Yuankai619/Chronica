import { createClient } from "@/lib/supabase/server";
import { sortCategories } from "@/lib/categories";
import { getReconciledSession } from "@/server/timer";
import { getOpenTasks } from "@/server/microsoft";
import { TimerPanel } from "@/components/timer-panel";
import { formatDuration } from "@/lib/entries";
import { recordedByDay, dayKey } from "@/lib/unrecorded";
import { Card } from "@/components/ui/card";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayKey = dayKey(new Date());

  const [
    { data: categories },
    session,
    { data: todayEntries },
    { data: plannedToday },
  ] = await Promise.all([
    supabase.from("categories").select("*").is("archived_at", null),
    getReconciledSession(supabase, user!.id),
    supabase
      .from("time_entries")
      .select("*")
      .gte("started_at", todayStart.toISOString()),
    supabase
      .from("planned_items")
      .select("*")
      .eq("day", todayKey)
      .order("position"),
  ]);

  const tasks = await getOpenTasks(supabase, user!.id);

  const plannedMinutes = (plannedToday ?? []).reduce(
    (s, i) => s + i.expected_minutes,
    0,
  );
  const recordedToday = recordedByDay(todayEntries ?? []).get(todayKey) ?? 0;
  const remaining = Math.max(0, plannedMinutes - recordedToday);

  return (
    <main>
      <h1 className="mb-6 text-xl font-semibold">Timer</h1>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <TimerPanel
          categories={sortCategories(categories ?? [])}
          session={session}
          tasks={tasks}
          plannedToday={plannedToday ?? []}
        />
        <div className="order-first grid grid-cols-2 gap-3 lg:order-0 lg:grid-cols-1 lg:content-start">
          <Card>
            <p className="microlabel mb-1">Recorded today</p>
            <p className="font-mono text-2xl font-semibold tabular-nums">
              {formatDuration(recordedToday)}
            </p>
          </Card>
          <Card>
            <p className="microlabel mb-1">Planned remaining</p>
            <p
              className={`font-mono text-2xl font-semibold tabular-nums ${remaining > 0 ? "text-accent" : ""}`}
            >
              {formatDuration(remaining)}
            </p>
          </Card>
        </div>
      </div>
    </main>
  );
}
