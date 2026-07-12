# Chronica

A personal web app for time management based on Lyubishchev's time-statistics
method. See [requirement.md](./requirement.md) for the full product spec.

## Tech Stack

- [Next.js](https://nextjs.org/) (App Router) + TypeScript
- [Supabase](https://supabase.com/) (Postgres, auth)
- pnpm as the package manager

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script              | Purpose                        |
| ------------------- | ------------------------------ |
| `pnpm dev`          | Start the development server   |
| `pnpm build`        | Production build               |
| `pnpm start`        | Serve the production build     |
| `pnpm lint`         | Run ESLint                     |
| `pnpm lint:fix`     | Run ESLint with auto-fix       |
| `pnpm type-check`   | TypeScript type checking       |
| `pnpm test`         | Run unit tests (Vitest)        |
| `pnpm test:watch`   | Run unit tests in watch mode   |
| `pnpm format`       | Format files with Prettier     |
| `pnpm format:check` | Check formatting without write |

## Contributing

All changes go through pull requests — see
[CONTRIBUTING.md](./CONTRIBUTING.md) for branch and PR conventions.
