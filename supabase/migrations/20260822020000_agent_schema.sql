-- AI Agent: chat conversations/messages, and a richer long-term memory shape.

create table public.agent_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

-- Conversation list is paged by recency.
create index agent_conversations_user_recency_idx
  on public.agent_conversations (user_id, last_message_at desc);

alter table public.agent_conversations enable row level security;

create policy agent_conversations_owner on public.agent_conversations
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- One row per AI SDK UIMessage. `parts` is the UIMessage's `parts` array
-- verbatim (text, tool-call, tool-result, approval, etc.) so the transcript
-- re-renders exactly as it streamed, including tool cards.
create table public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.agent_conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  parts jsonb not null,
  created_at timestamptz not null default now()
);

-- Message pagination within a conversation is by recency, oldest-first on
-- the page itself but paged newest-first (scroll up for more).
create index agent_messages_conversation_recency_idx
  on public.agent_messages (conversation_id, created_at desc);

alter table public.agent_messages enable row level security;

create policy agent_messages_owner on public.agent_messages
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Bumping last_message_at on every insert keeps the conversation list's
-- ordering (and thus its pagination cursor) correct without a round trip
-- from the app.
create or replace function public.bump_agent_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.agent_conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger agent_messages_bump_conversation
  after insert on public.agent_messages
  for each row execute function public.bump_agent_conversation_last_message();

-- Long-term memory: was a flat, untyped note list. The Retro/Plan commands
-- need to distinguish durable patterns from one-off preferences, optionally
-- scope a note to a category, and let confidence decay so stale
-- observations stop influencing future prompts.
alter table public.ai_memories
  add column kind text not null default 'pattern'
    check (kind in ('pattern', 'preference', 'trend', 'constraint')),
  add column category_id uuid references public.categories (id) on delete set null,
  add column confidence real not null default 0.7 check (confidence between 0 and 1),
  add column last_confirmed_at timestamptz not null default now(),
  add column source_week date;

create index ai_memories_category_id_idx on public.ai_memories (category_id);
