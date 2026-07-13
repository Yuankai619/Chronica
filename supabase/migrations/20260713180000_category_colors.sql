-- User-defined category accent colors (hex); null falls back to the
-- stable auto palette.

alter table public.categories
  add column color text check (color ~ '^#[0-9a-f]{6}$');
