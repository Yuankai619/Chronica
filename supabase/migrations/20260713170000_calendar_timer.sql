-- Calendar-driven timer sessions: a timed event with a category starts
-- an automatic, locked timer session for its window.

alter table public.timer_sessions
  add column planned_item_id uuid references public.planned_items (id) on delete set null;

-- Prevents re-starting an event's session after it ended or was stopped.
alter table public.planned_items
  add column auto_timer_done boolean not null default false;
