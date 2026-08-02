import { createClient } from "@/lib/supabase/server";
import { sortCategories } from "@/lib/categories";
import { EntriesManager } from "@/components/entries-manager";
import { getOpenTasks } from "@/server/microsoft";
import { getUserTimeZone } from "@/server/tz";
import { PrototypeSwitcher } from "@/components/prototype-switcher";
import {
  VARIANTS,
  VARIANT_LABELS,
} from "@/components/entry-row-prototype-variants";

export const metadata = { title: "Entries — Chronica" };

const DAYS_SHOWN = 14;

// PROTOTYPE (#63): three entry-row layouts on this route, switchable via
// `?variant=A|B|C`. Remove the switcher and the variants once one wins.
export default async function EntriesPage({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string }>;
}) {
  const { variant } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const timeZone = await getUserTimeZone();

  const since = new Date();
  since.setDate(since.getDate() - DAYS_SHOWN);

  const [{ data: categories }, { data: entries, error }, tasks] =
    await Promise.all([
      supabase.from("categories").select("*"),
      supabase
        .from("time_entries")
        .select("*")
        .gte("started_at", since.toISOString())
        .order("started_at", { ascending: false })
        .limit(300),
      getOpenTasks(supabase, user!.id),
    ]);

  if (error) {
    return (
      <main>
        <h1 className="mb-6 text-xl font-semibold">Entries</h1>
        <p className="text-sm text-muted">Failed to load: {error.message}</p>
      </main>
    );
  }

  return (
    <main>
      <h1 className="mb-6 text-xl font-semibold">Entries</h1>
      <EntriesManager
        categories={sortCategories(categories ?? [])}
        entries={entries ?? []}
        tasks={tasks}
        variant={variant && VARIANTS.includes(variant as "A") ? variant : "A"}
        timeZone={timeZone}
      />
      <PrototypeSwitcher variants={[...VARIANTS]} labels={VARIANT_LABELS} />
    </main>
  );
}
