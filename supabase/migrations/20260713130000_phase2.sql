-- Phase 2: personal principles, AI retros, and AI long-term memory.

create table public.principles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

create index principles_user_id_idx on public.principles (user_id);

alter table public.principles enable row level security;

create policy principles_owner on public.principles
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- One retro per planned week, generated on demand (never automatically).
create table public.retros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  content text not null,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

alter table public.retros enable row level security;

create policy retros_owner on public.retros
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Long-term memory notes the AI maintains across weeks.
create table public.ai_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_memories_user_id_idx on public.ai_memories (user_id);

create trigger ai_memories_updated_at
  before update on public.ai_memories
  for each row execute function public.set_updated_at();

alter table public.ai_memories enable row level security;

create policy ai_memories_owner on public.ai_memories
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
