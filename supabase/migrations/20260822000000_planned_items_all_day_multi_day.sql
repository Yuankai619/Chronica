-- All-day and multi-day calendar events materialize one planned_items row
-- per calendar day they span, so each day's board shows the part of the
-- event that falls on it. All-day events carry no meaningful duration, so
-- expected_minutes may now be zero for them.

alter table public.planned_items
  add column is_all_day boolean not null default false;

alter table public.planned_items
  drop constraint planned_items_expected_minutes_check,
  add constraint planned_items_expected_minutes_check check (expected_minutes >= 0);

drop index public.planned_items_gcal_event_idx;

create unique index planned_items_gcal_event_idx
  on public.planned_items (user_id, gcal_event_id, day)
  where gcal_event_id is not null;
