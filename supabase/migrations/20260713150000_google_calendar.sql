-- Google Calendar linking (read-only) and calendar-sourced planned items.

create table public.google_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  account_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger google_accounts_updated_at
  before update on public.google_accounts
  for each row execute function public.set_updated_at();

alter table public.google_accounts enable row level security;

create policy google_accounts_owner on public.google_accounts
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Calendar events appear on the planning board as items that may not have
-- a category yet, carrying the event title and concrete times.
alter table public.planned_items
  alter column category_id drop not null;

alter table public.planned_items
  add column gcal_event_id text,
  add column title text,
  add column start_at timestamptz,
  add column end_at timestamptz;

create unique index planned_items_gcal_event_idx
  on public.planned_items (user_id, gcal_event_id)
  where gcal_event_id is not null;
