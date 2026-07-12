-- Chronica initial schema (Phase 1)
-- Single-user personal app; every row is owned by a user and protected by
-- owner-only RLS. Durations are stored in minutes.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.category_group as enum ('core', 'supportive', 'social', 'rest');
create type public.entry_source as enum ('timer', 'manual');

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- user_settings — per-user configuration
-- ---------------------------------------------------------------------------

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Hard cap for a single timer session (default 4 hours).
  timer_cap_minutes integer not null default 240
    check (timer_cap_minutes between 15 and 1440),
  -- Daily recorded-time target (default 14 hours) for unrecorded-time view.
  daily_target_minutes integer not null default 840
    check (daily_target_minutes between 0 and 1440),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

alter table public.user_settings enable row level security;

create policy user_settings_owner on public.user_settings
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  category_group public.category_group not null,
  -- Admin/AI context only; never rendered on the execution/timer UI.
  description text,
  -- Categories with entries are archived instead of deleted.
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index categories_user_id_idx on public.categories (user_id);

create trigger categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

alter table public.categories enable row level security;

create policy categories_owner on public.categories
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- time_entries — completed recordings (from timer or quick add)
-- ---------------------------------------------------------------------------

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id),
  -- started_at determines week attribution (week starts Monday; an entry
  -- belongs to the week it STARTED in, even across midnight).
  started_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes > 0),
  note text,
  source public.entry_source not null default 'manual',
  -- Set when a timer was auto-stopped at the hard cap.
  needs_confirmation boolean not null default false,
  -- Optional Microsoft To Do annotation (read-only integration).
  todo_task_id text,
  todo_task_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index time_entries_user_started_idx
  on public.time_entries (user_id, started_at desc);
create index time_entries_category_id_idx
  on public.time_entries (category_id);
create index time_entries_user_task_idx
  on public.time_entries (user_id, todo_task_id)
  where todo_task_id is not null;

create trigger time_entries_updated_at
  before update on public.time_entries
  for each row execute function public.set_updated_at();

alter table public.time_entries enable row level security;

create policy time_entries_owner on public.time_entries
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- timer_sessions — the (at most one) currently running timer per user
-- ---------------------------------------------------------------------------

create table public.timer_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id),
  -- Server-side start timestamp is the source of truth.
  started_at timestamptz not null default now(),
  -- Optional expected duration for the reminder notification.
  expected_minutes integer check (expected_minutes > 0),
  -- Cap snapshotted from user_settings at start time.
  cap_minutes integer not null,
  todo_task_id text,
  todo_task_title text,
  created_at timestamptz not null default now()
);

-- Only one running timer per user; also makes double-click starts idempotent.
create unique index timer_sessions_one_per_user on public.timer_sessions (user_id);
create index timer_sessions_category_id_idx on public.timer_sessions (category_id);

alter table public.timer_sessions enable row level security;

create policy timer_sessions_owner on public.timer_sessions
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- weekly_plans + weekly_plan_items — budgets and rollover snapshots
-- ---------------------------------------------------------------------------

create table public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Monday of the planned week.
  week_start date not null check (extract(isodow from week_start) = 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create trigger weekly_plans_updated_at
  before update on public.weekly_plans
  for each row execute function public.set_updated_at();

alter table public.weekly_plans enable row level security;

create policy weekly_plans_owner on public.weekly_plans
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table public.weekly_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.weekly_plans (id) on delete cascade,
  category_id uuid not null references public.categories (id),
  budgeted_minutes integer not null check (budgeted_minutes >= 0),
  -- Rollover applied at planning time; a SNAPSHOT — later edits to past
  -- weeks' entries never change it. Signed: surplus > 0, deficit < 0.
  rollover_minutes integer not null default 0,
  unique (plan_id, category_id)
);

create index weekly_plan_items_plan_id_idx on public.weekly_plan_items (plan_id);
create index weekly_plan_items_category_id_idx on public.weekly_plan_items (category_id);

alter table public.weekly_plan_items enable row level security;

-- Ownership flows through the parent plan (indexed lookup).
create policy weekly_plan_items_owner on public.weekly_plan_items
  for all
  using (
    exists (
      select 1 from public.weekly_plans p
      where p.id = plan_id and p.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.weekly_plans p
      where p.id = plan_id and p.user_id = (select auth.uid())
    )
  );
