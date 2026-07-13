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
- Weekly plans are **snapshots** — editing past entries never rewrites a saved plan.
- Category descriptions are admin/AI context only; never render them on the
  execution/timer UI.

## Workflow

- Every change goes through a PR — no direct commits to `main`.
  See [CONTRIBUTING.md](./CONTRIBUTING.md) for branch and PR conventions
  (Conventional Commit titles, <600 changed lines per PR).
- UI style: minimalist, dark theme, RWD, no "AI-looking" design.
