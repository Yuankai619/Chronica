import { createClient } from "@/lib/supabase/server";
import { sortCategories } from "@/lib/categories";
import { getReconciledSession } from "@/server/timer";
import { TimerPanel } from "@/components/timer-panel";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: categories }, session] = await Promise.all([
    supabase.from("categories").select("*").is("archived_at", null),
    getReconciledSession(supabase, user!.id),
  ]);

  return (
    <main>
      <h1 className="mb-6 text-xl font-semibold">Timer</h1>
      <TimerPanel
        categories={sortCategories(categories ?? [])}
        session={session}
      />
    </main>
  );
}
