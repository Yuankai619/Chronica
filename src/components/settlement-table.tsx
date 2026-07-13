import { formatSignedDuration, type WeekSettlement } from "@/lib/settlement";
import { formatDuration } from "@/lib/entries";
import { CategoryBadge } from "@/components/ui/badge";

export function SettlementTable({
  settlement,
}: {
  settlement: WeekSettlement;
}) {
  if (settlement.rows.length === 0) {
    return (
      <p className="text-sm text-muted">
        Nothing recorded or planned this week yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-hairline text-left">
            <th className="microlabel py-2 font-normal">Category</th>
            <th className="microlabel py-2 text-right font-normal">Planned</th>
            <th className="microlabel py-2 text-right font-normal">Actual</th>
            <th className="microlabel py-2 text-right font-normal">Δ</th>
          </tr>
        </thead>
        <tbody>
          {settlement.rows.map((row) => (
            <tr key={row.category.id} className="border-b border-hairline">
              <td className="py-2.5">
                <CategoryBadge id={row.category.id} name={row.category.name} />
              </td>
              <td className="py-2.5 text-right font-mono text-muted tabular-nums">
                {row.plannedMinutes === null
                  ? "—"
                  : formatDuration(row.plannedMinutes)}
              </td>
              <td className="py-2.5 text-right font-mono tabular-nums">
                {formatDuration(row.actualMinutes)}
              </td>
              <td
                className={`py-2.5 text-right font-mono tabular-nums ${
                  row.diffMinutes === null
                    ? "text-muted"
                    : row.diffMinutes > 0
                      ? "text-danger"
                      : "text-[#6fd29c]"
                }`}
              >
                {row.diffMinutes === null
                  ? "—"
                  : formatSignedDuration(row.diffMinutes)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
