# Contributing

## Workflow

All changes — no exceptions — go through pull requests. Never commit directly
to `main`.

1. Branch from `main` (or from another open PR branch when stacking).
2. Make your change, keeping it small and focused.
3. Run the full check suite locally:
   ```bash
   pnpm lint && pnpm type-check && pnpm test && pnpm format:check
   ```
4. Open a PR with the GitHub CLI or web UI.

### Stacked PRs

When a change depends on an unmerged PR, branch off that PR's branch and open
the new PR against `main`. Note the dependency in the PR description
("Stacked on #N"). After #N merges, rebase or let GitHub retarget.

## PR Conventions

### Title (required format)

PR titles must follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <description>
```

Allowed types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`,
`perf`, `style`, `build`, `revert`.

Examples:

- `feat(timer): auto-stop sessions at the hard duration cap`
- `fix: attribute cross-midnight entries to the starting week`
- `docs: add rollover snapshot rules to AGENTS.md`

### Size limit

Each PR must change **fewer than 600 lines** (additions + deletions),
**excluding**:

- Lockfiles (`pnpm-lock.yaml`)
- Generated files and vendored third-party content (e.g. `.agents/skills/`)

If a change cannot fit, split it into stacked PRs. The limit is a working
convention (not enforced by CI) — keep PRs reviewable.

### Description

No required format for now. Including a short summary and "Stacked on #N"
notes for stacked PRs is appreciated.

## Branch Naming

`<type>/<short-kebab-description>`, e.g. `feat/weekly-settlement-view`,
`chore/tooling`, `docs/agents-and-conventions`.
