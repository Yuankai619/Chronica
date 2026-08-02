-- Deleting a time entry is a soft delete: the row keeps its id and every
-- column, and is purged for real after the retention window. Excluding
-- deleted rows is the application's job — RLS is unchanged.

alter table public.time_entries
  add column deleted_at timestamptz;

-- Every read path carries `deleted_at is null`, so the main index only
-- needs to cover live rows.
drop index if exists time_entries_user_started_idx;
create index time_entries_user_started_idx
  on public.time_entries (user_id, started_at desc)
  where deleted_at is null;

-- The deleted-entries page orders by deletion time.
create index time_entries_user_deleted_idx
  on public.time_entries (user_id, deleted_at desc)
  where deleted_at is not null;
