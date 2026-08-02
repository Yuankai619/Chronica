import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { deletedRetentionCutoff, DELETED_RETENTION_DAYS } from "@/lib/entries";
import { getUserTimeZone } from "@/server/tz";
import { DeletedEntriesList } from "@/components/deleted-entries-list";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Deleted entries — Chronica" };

export default async function DeletedEntriesPage() {
  const supabase = await createClient();
  const timeZone = await getUserTimeZone();
  const now = new Date();
  const cutoff = deletedRetentionCutoff(now).toISOString();

  // Purge on read as well as on delete, so the retention promise does not
  // depend on the user deleting something else.
  await supabase.from("time_entries").delete().lt("deleted_at", cutoff);

  const [{ data: categories }, { data: entries, error }] = await Promise.all([
    supabase.from("categories").select("*"),
    supabase
      .from("time_entries")
      .select("*")
      .not("deleted_at", "is", null)
      .gte("deleted_at", cutoff)
      .order("deleted_at", { ascending: false }),
  ]);

  return (
    <main>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Deleted entries</h1>
        <Link
          className="text-sm text-muted hover:text-foreground"
          href="/entries"
        >
          ← Entries
        </Link>
      </div>

      {error ? (
        <p className="text-sm text-danger">Failed to load: {error.message}</p>
      ) : (entries ?? []).length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            Nothing deleted in the last {DELETED_RETENTION_DAYS} days.
          </p>
          <Link
            className="mt-2 inline-block text-sm text-muted hover:text-foreground"
            href="/entries"
          >
            Back to entries
          </Link>
        </Card>
      ) : (
        <DeletedEntriesList
          entries={entries ?? []}
          categories={categories ?? []}
          timeZone={timeZone}
          nowIso={now.toISOString()}
        />
      )}
    </main>
  );
}
