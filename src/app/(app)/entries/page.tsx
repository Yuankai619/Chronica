import { createClient } from "@/lib/supabase/server";
import { sortCategories } from "@/lib/categories";
import { EntriesManager } from "@/components/entries-manager";
import { getOpenTasks } from "@/server/microsoft";

export const metadata = { title: "Entries — Chronica" };

const DAYS_SHOWN = 14;

export default async function EntriesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const since = new Date();
  since.setDate(since.getDate() - DAYS_SHOWN);

  const [{ data: categories }, { data: entries, error }] = await Promise.all([
    supabase.from("categories").select("*"),
    supabase
      .from("time_entries")
      .select("*")
      .gte("started_at", since.toISOString())
      .order("started_at", { ascending: false })
      .limit(300),
  ]);

  if (error) {
    return (
      <main>
        <h1 className="mb-6 text-xl font-semibold">Entries</h1>
        <p className="text-sm text-muted">Failed to load: {error.message}</p>
      </main>
    );
  }

  const tasks = await getOpenTasks(supabase, user!.id);

  return (
    <main>
      <h1 className="mb-6 text-xl font-semibold">Entries</h1>
      <EntriesManager
        categories={sortCategories(categories ?? [])}
        entries={entries ?? []}
        tasks={tasks}
      />
    </main>
  );
}
