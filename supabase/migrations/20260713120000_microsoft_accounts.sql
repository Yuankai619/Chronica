-- Linked Microsoft account per user, used read-only for To Do access.
-- Microsoft login is NOT a sign-in method; this stores OAuth tokens only.

create table public.microsoft_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  -- When the access token expires (with a safety margin applied on read).
  expires_at timestamptz not null,
  -- Microsoft account display info for the settings page.
  account_username text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger microsoft_accounts_updated_at
  before update on public.microsoft_accounts
  for each row execute function public.set_updated_at();

alter table public.microsoft_accounts enable row level security;

create policy microsoft_accounts_owner on public.microsoft_accounts
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
