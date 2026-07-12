import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { sortCategories } from "@/lib/categories";
import { getWeekKey, getWeekStart } from "@/lib/week";
import { getPastWeeks } from "@/server/planning";
import { computeBalanceContext } from "@/lib/planning";
import { computeAccuracy } from "@/lib/accuracy";
import { PlanningForm } from "@/components/planning-form";
import { RetroCard } from "@/components/retro-card";

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

  const [{ data: categories }, pastWeeks, { data: plan }] = await Promise.all([
    supabase.from("categories").select("*").is("archived_at", null),
    getPastWeeks(supabase, user!.id, weekKey),
    supabase
      .from("weekly_plans")
      .select("*")
      .eq("week_start", weekKey)
      .maybeSingle(),
  ]);

  const balances = computeBalanceContext(pastWeeks);
  const accuracy = computeAccuracy(pastWeeks);

  const reviewWeekKey = shiftWeekKey(weekKey, -1);
  const { data: retro } = await supabase
    .from("retros")
    .select("content")
    .eq("week_start", reviewWeekKey)
    .maybeSingle();

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

      <div className="mb-8">
        <RetroCard
          reviewWeekKey={reviewWeekKey}
          initialContent={retro?.content ?? null}
        />
      </div>

      <PlanningForm
        weekKey={weekKey}
        categories={sortCategories(categories ?? [])}
        planItems={planItems}
        balances={Object.fromEntries(balances)}
        accuracy={Object.fromEntries(accuracy)}
      />
    </main>
  );
}
