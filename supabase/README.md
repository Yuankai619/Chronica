# Supabase

SQL migrations for the Chronica database live in `migrations/`.

## Applying migrations

With the [Supabase CLI](https://supabase.com/docs/guides/local-development)
linked to your project:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Or paste the migration files (in filename order) into the Dashboard SQL
Editor and run them.

## Conventions

- Durations are stored as integer **minutes**.
- Every table is owned by `user_id` with owner-only RLS; policies wrap
  `auth.uid()` in a subselect for performance.
- `weekly_plans.week_start` is always a Monday (enforced by a check
  constraint); entries attribute to the week their `started_at` falls in.
