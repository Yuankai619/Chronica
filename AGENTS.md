# AGENTS.md — Guide for AI Agents

Chronica is a personal time-management web app based on Lyubishchev's
time-statistics method. The full behavioral spec lives in
[requirement.md](./requirement.md) — read it before implementing features.

## Tech Stack

- **Framework:** Next.js (App Router only — never the Pages Router) + TypeScript (strict)
- **Backend:** Supabase (Postgres, Google sign-in; Microsoft OAuth is link-only for To Do access)
- **AI (Phase 2):** Mastra Agent with an OpenAI-compatible LLM provider
- **Package manager:** pnpm — never use npm or yarn
- **Testing:** Vitest + Testing Library; unit tests are required for domain logic

## Commands

| Command           | Purpose                    |
| ----------------- | -------------------------- |
| `pnpm dev`        | Dev server                 |
| `pnpm build`      | Production build           |
| `pnpm lint`       | ESLint (`lint:fix` to fix) |
| `pnpm type-check` | `tsc --noEmit`             |
| `pnpm test`       | Vitest run (`test:watch`)  |
| `pnpm format`     | Prettier (`format:check`)  |

Before pushing: `pnpm lint && pnpm type-check && pnpm test && pnpm format:check`.

## Secrets (git-crypt)

`.env` is committed but **encrypted with [git-crypt](https://github.com/AGWA/git-crypt)**.
This repo is public — never commit it in the clear.

On a fresh clone:

```bash
pnpm install                  # also sets core.hooksPath=.githooks
git-crypt unlock              # needs the project GPG key in your keyring
git-crypt status -e           # should list .env
```

Until you unlock, `.env` on disk is ciphertext and the app will not boot.
A `pre-commit` hook in [.githooks/](.githooks/) blocks any commit that stages
`.env` as plaintext; if it fires, the filter is broken — fix it, don't
`--no-verify`.

## Project Layout

- `src/app/(app)/` — authenticated pages (timer, entries, week, planning,
  tasks, summary, categories, settings) + their server actions
- `src/app/api/` — route handlers (Microsoft OAuth, AI retro)
- `src/lib/` — pure domain logic (week attribution, settlement, rollover,
  accuracy, summaries); keep this framework-free and unit-tested
- `src/server/` — server-only services (timer reconcile, planning context,
  Microsoft Graph, Mastra retro agent)
- `src/components/` — React components; `src/components/ui/` shadcn-style
  primitives (Tailwind v4 tokens in `globals.css`)
- `.agents/skills/` — installed agent skills (see below)

## Skills

Repo-installed skills (symlinked into `.claude/skills/`):

- `vercel-react-best-practices` — load when writing or reviewing React/Next.js code
- `nextjs-app-router-patterns` — load when adding routes, layouts, or data fetching
- `supabase-postgres-best-practices` — load when designing schema or writing queries

## Domain Rules That Bite

- The week starts on **Monday**. An entry belongs to the week in which it
  **started**, even across midnight (`src/lib/week.ts`).
- Categories are purely user-defined (no fixed groups); badge colors come
  from a stable hash of the category id.
- Calendar-synced planned items with a category auto-start **locked** timer
  sessions for their window (`src/server/timer.ts`); manual timing is
  refused while one runs.
- Only one timer may run at a time; starting a new one stops and saves the old one.
- Timer truth lives in **server-side timestamps**, never client clocks.
- Deleting a category with entries **archives** it; history must stay intact.
- Deleting a time entry is a **soft delete** (`deleted_at`), kept for 14 days.
  Every read of `time_entries` must carry `deleted_at is null`; the only
  exception is the count in `deleteCategory()` that decides whether a category
  can be hard-deleted.
- Weekly plans are **snapshots** — editing past entries never rewrites a saved plan.
- Category descriptions are admin/AI context only; never render them on the
  execution/timer UI.

## Workflow

- Every change goes through a PR — no direct commits to `main`.
  See [CONTRIBUTING.md](./CONTRIBUTING.md) for branch and PR conventions
  (Conventional Commit titles, <600 changed lines per PR).
- UI style: minimalist, dark theme, RWD, no "AI-looking" design.
