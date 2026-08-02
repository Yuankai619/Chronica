-- Categories that are recorded but must not reach any total (sleep, say).
-- Their rows still appear in every statistic; only the sums exclude them.

alter table public.categories
  add column excluded_from_totals boolean not null default false;
