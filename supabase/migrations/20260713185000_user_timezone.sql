-- Add timezone column to user_settings (default Asia/Taipei / UTC+8)
-- ---------------------------------------------------------------------------

alter table public.user_settings
  add column if not exists timezone text not null default 'Asia/Taipei';
