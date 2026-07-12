"use client";

import { useState, useTransition } from "react";
import { savePlan } from "@/app/(app)/planning/actions";
import type { Category } from "@/lib/categories";
import { CATEGORY_GROUP_LABELS } from "@/lib/categories";
import type { CategoryBalance } from "@/lib/planning";
import type { PlanItem } from "@/lib/settlement";
import { formatSignedDuration } from "@/lib/settlement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function PlanningForm({
  weekKey,
  categories,
  planItems,
  balances,
}: {
  weekKey: string;
  categories: Category[];
  planItems: PlanItem[] | null;
  balances: Record<string, CategoryBalance>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const existing = new Map(
    (planItems ?? []).map((item) => [item.category_id, item]),
  );

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await savePlan(weekKey, formData);
      if (result.error) {
        setError(result.error);
        setSaved(false);
      } else {
        setError(null);
        setSaved(true);
      }
    });
  }

  if (categories.length === 0) {
    return (
      <p className="text-sm text-muted">
        Create categories first, then plan your week.
      </p>
    );
  }

  return (
    <form action={submit}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left">
              <th className="microlabel py-2 font-normal">Category</th>
              <th className="microlabel py-2 font-normal">Budget</th>
              <th className="microlabel py-2 text-right font-normal">
                Last week
              </th>
              <th className="microlabel py-2 text-right font-normal">
                Cumulative
              </th>
              <th className="microlabel py-2 text-center font-normal">Carry</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => {
              const balance = balances[category.id];
              const item = existing.get(category.id);
              const recentTitle = balance?.recent
                .map(([w, b]) => `${w}: ${formatSignedDuration(b)}`)
                .join("\n");
              return (
                <tr key={category.id} className="border-b border-hairline">
                  <td className="py-2.5 pr-3">
                    <span className="mr-2 font-medium">{category.name}</span>
                    <Badge variant={category.category_group}>
                      {CATEGORY_GROUP_LABELS[category.category_group]}
                    </Badge>
                  </td>
                  <td className="py-2.5 pr-3">
                    <Input
                      name={`budget_${category.id}`}
                      placeholder="5:00 or 300"
                      defaultValue={
                        item && item.budgeted_minutes > 0
                          ? String(item.budgeted_minutes)
                          : ""
                      }
                      className="w-28 font-mono"
                      aria-label={`Budget for ${category.name}`}
                    />
                  </td>
                  <td
                    className="py-2.5 text-right font-mono text-muted tabular-nums"
                    title={recentTitle}
                  >
                    {balance?.lastBalance != null
                      ? formatSignedDuration(balance.lastBalance)
                      : "—"}
                  </td>
                  <td className="py-2.5 text-right font-mono text-muted tabular-nums">
                    {balance
                      ? formatSignedDuration(balance.cumulativeBalance)
                      : "—"}
                  </td>
                  <td className="py-2.5 text-center">
                    <input
                      type="checkbox"
                      name={`carry_${category.id}`}
                      defaultChecked={!!item && item.rollover_minutes !== 0}
                      disabled={!balance || balance.lastBalance === null}
                      aria-label={`Carry balance for ${category.name}`}
                      className="size-4 accent-[#f0b429]"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save plan"}
        </Button>
        {saved ? <span className="text-sm text-[#6fd29c]">Saved.</span> : null}
        {error ? <span className="text-sm text-danger">{error}</span> : null}
      </div>
      <p className="mt-3 text-xs text-muted">
        Carry snapshots the category&apos;s last-week balance into this plan.
        Budgets accept minutes (300) or h:mm (5:00). Blank = no budget.
      </p>
    </form>
  );
}
