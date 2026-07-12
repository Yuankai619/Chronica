import { createClient } from "@/lib/supabase/server";
import { sortCategories } from "@/lib/categories";
import { getReconciledSession } from "@/server/timer";
import { getOpenTasks } from "@/server/microsoft";
import { TimerPanel } from "@/components/timer-panel";
import { formatDuration } from "@/lib/entries";
import {
  DEFAULT_DAILY_TARGET_MINUTES,
  recordedByDay,
  dayKey,
} from "@/lib/unrecorded";
import { Card } from "@/components/ui/card";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    { data: categories },
    session,
    { data: todayEntries },
    { data: settings },
  ] = await Promise.all([
    supabase.from("categories").select("*").is("archived_at", null),
    getReconciledSession(supabase, user!.id),
    supabase
      .from("time_entries")
      .select("*")
      .gte("started_at", todayStart.toISOString()),
    supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user!.id)
      .maybeSingle(),
  ]);

  const tasks = await getOpenTasks(supabase, user!.id);

  const target = settings?.daily_target_minutes ?? DEFAULT_DAILY_TARGET_MINUTES;
  const recordedToday =
    recordedByDay(todayEntries ?? []).get(dayKey(new Date())) ?? 0;
  const unrecorded = Math.max(0, target - recordedToday);

  return (
    <main>
      <h1 className="mb-6 text-xl font-semibold">Timer</h1>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <TimerPanel
          categories={sortCategories(categories ?? [])}
          session={session}
          tasks={tasks}
        />
        <div className="order-first grid grid-cols-2 gap-3 lg:order-0 lg:grid-cols-1 lg:content-start">
          <Card>
            <p className="microlabel mb-1">Recorded today</p>
            <p className="font-mono text-2xl font-semibold tabular-nums">
              {formatDuration(recordedToday)}
            </p>
          </Card>
          <Card>
            <p className="microlabel mb-1">Unrecorded</p>
            <p
              className={`font-mono text-2xl font-semibold tabular-nums ${unrecorded > 0 ? "text-accent" : ""}`}
            >
              {formatDuration(unrecorded)}
            </p>
          </Card>
        </div>
      </div>
    </main>
  );
}
