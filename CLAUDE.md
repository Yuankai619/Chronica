# CLAUDE.md

See [AGENTS.md](./AGENTS.md) for the full agent guide: tech stack, commands,
project layout, domain rules, and workflow. Highlights:

- Use **pnpm** for everything; Next.js **App Router** only.
- Run `pnpm lint && pnpm type-check && pnpm test && pnpm format:check` before pushing.
- All changes via PR: Conventional Commit titles, <600 changed lines
  (excluding lockfiles) — see [CONTRIBUTING.md](./CONTRIBUTING.md).
- Load the repo skills in `.claude/skills/` when working on React/Next.js
  code or Supabase schema.
- The behavioral spec is [requirement.md](./requirement.md); the domain rules
  section of AGENTS.md lists the invariants that are easy to get wrong.
