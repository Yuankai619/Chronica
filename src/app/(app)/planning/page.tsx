import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { sortCategories } from "@/lib/categories";
import { getWeekKey, getWeekStart } from "@/lib/week";
import { getBalanceContext } from "@/server/planning";
import { PlanningForm } from "@/components/planning-form";

export const metadata = { title: "Planning — Chronica" };

function parseWeekParam(raw: string | undefined): string {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const parsed = new Date(`${raw}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) return getWeekKey(parsed);
  }
  return getWeekKey(new Date());
}

function shiftWeekKey(weekKey: string, weeks: number): string {
  const d = getWeekStart(new Date(`${weekKey}T00:00:00`));
  d.setDate(d.getDate() + weeks * 7);
  return getWeekKey(d);
}

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const weekKey = parseWeekParam(week);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: categories }, balances, { data: plan }] = await Promise.all([
    supabase.from("categories").select("*").is("archived_at", null),
    getBalanceContext(supabase, user!.id, weekKey),
    supabase
      .from("weekly_plans")
      .select("*")
      .eq("week_start", weekKey)
      .maybeSingle(),
  ]);

  const { data: planItems } = plan
    ? await supabase
        .from("weekly_plan_items")
        .select("*")
        .eq("plan_id", plan.id)
    : { data: null };

  return (
    <main>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          Plan week of <span className="font-mono tabular-nums">{weekKey}</span>
        </h1>
        <nav className="flex gap-3 text-sm">
          <Link
            className="text-muted hover:text-foreground"
            href={`/planning?week=${shiftWeekKey(weekKey, -1)}`}
          >
            ← Prev
          </Link>
          <Link
            className="text-muted hover:text-foreground"
            href={`/planning?week=${shiftWeekKey(weekKey, 1)}`}
          >
            Next →
          </Link>
        </nav>
      </div>

      {plan ? (
        <p className="mb-4 text-sm text-muted">
          This week already has a saved plan — saving again replaces it and
          re-snapshots carried balances.
        </p>
      ) : null}

      <PlanningForm
        weekKey={weekKey}
        categories={sortCategories(categories ?? [])}
        planItems={planItems}
        balances={Object.fromEntries(balances)}
      />
    </main>
  );
}
