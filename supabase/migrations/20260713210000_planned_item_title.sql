-- Calendar event title snapshotted at session start, copied to the entry's
-- note when the session is saved. Snapshotting keeps the note truthful even
-- when the event is renamed or removed mid-session.

alter table public.timer_sessions
  add column planned_item_title text;
