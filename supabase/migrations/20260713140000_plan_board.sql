-- Day-based planning board replaces weekly budgets and rollover, plus
-- To Do write-back support (list ids + completed-today tracking).

drop table if exists public.weekly_plan_items;
drop table if exists public.weekly_plans;

create table public.planned_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- The calendar day this item is planned for.
  day date not null,
  category_id uuid not null references public.categories (id),
  expected_minutes integer not null check (expected_minutes > 0),
  -- Order within the day's column (drag & drop).
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index planned_items_user_day_idx on public.planned_items (user_id, day);
create index planned_items_category_id_idx on public.planned_items (category_id);

alter table public.planned_items enable row level security;

create policy planned_items_owner on public.planned_items
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Completing a To Do task from Chronica needs the Graph list id.
alter table public.time_entries add column todo_list_id text;
alter table public.timer_sessions add column todo_list_id text;

-- Tasks completed from Chronica today (rows older than the current day
-- are purged on read; only today's completions are ever shown).
create table public.completed_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id text not null,
  list_id text not null,
  title text not null,
  completed_at timestamptz not null default now(),
  unique (user_id, task_id)
);

alter table public.completed_tasks enable row level security;

create policy completed_tasks_owner on public.completed_tasks
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
