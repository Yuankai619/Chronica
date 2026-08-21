# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A single primary user: the founder, who simultaneously runs a startup, studies in NYCU's CS graduate program, and interns at LINE. Chronica is a personal, single-user tool — not a multi-user or team product (explicit non-goal in requirement.md).

## Product Purpose

Chronica is a personal time-management app built on Lyubishchev's time-statistics method: record how time actually went (start/stop a timer per activity) instead of pre-scheduling exact clock slots, then plan the following week's time budget per category at half-hour granularity. It exists because pre-scheduled "do X at 3pm" planning and generic techniques like the Pomodoro method both failed for the founder once three overlapping roles (startup, grad school, internship) made rigid scheduling unworkable.

## Positioning

Most commercial time-tracking apps are paid and offer shallow analytics. Chronica's differentiated mechanism: (1) record-first, plan-second — planning happens at weekly, half-hour-granularity budgets per category (borrowed from Agile Sprint planning), not clock-time scheduling; (2) an AI Retro (Mastra agent) that keeps long-term memory of the user's real pace per category/task and warns when a plan underestimates a task the user historically underestimates (e.g., speech prep dragged out by anxiety).

## Operating Context

Weekly cycle framed explicitly as a Sprint: Planning (categorize the week's commitments, set time budgets, reconcile against the existing calendar) → Execution (Lyubishchev-style timing, quick-add for missed entries, Pomodoro-style overtime reminders, Google Calendar auto-timing, Microsoft To Do linkage) → AI Retro (conversational review of plan vs. actual, feeds long-term AI memory for next week's planning).

## Capabilities and Constraints

- Live product: https://chronica-yk.vercel.app/
- Source: https://github.com/Yuankai619/Chronica (public repo)
- Stack: Next.js App Router + TypeScript (strict), Supabase (Postgres, Google sign-in; Microsoft OAuth link-only for To Do), Mastra Agent (AI retro), pnpm, Vitest.
- Categories, timer (server-timestamp truth, hard cap + needs-confirmation flag, notifications), quick add, week-based day-board planning (drag & drop), live planned-vs-actual settlement, Google Calendar auto-timing (locks manual timing during a synced event window), Microsoft To Do integration (task linkage + one-way completion write-back), AI Retro with persistent memory, monthly/annual summaries — all implemented and in daily personal use as of this writing.
- Explicit non-goals (requirement.md "Out of Scope"): native mobile app, general two-way To Do sync, multi-user/sharing, HH:MM-to-HH:MM timeline scheduling, offline/PWA, CSV export, other time-management methods (e.g. plain Pomodoro as a standalone mode).
- UI direction mandated in AGENTS.md: minimalist, dark theme, RWD, explicitly "no AI-looking design."

## Brand Commitments

Product name: Chronica. Voice: first-person, personal, understated — this is the founder's own daily tool, not a company product; copy should read as an honest account of their own use, not marketing language.

## Evidence on Hand

- Working deployed product (URL above) and public GitHub history are the primary evidence of "action taken," not raw commit/PR/test counts — the founder has asked that internal dev metrics (commit count, PR count, test count, tech-stack detail) be kept out of user-facing pitch content; a link to the live app and repo is sufficient.
- No user testimonials, press, or external users exist — this is single-user personal software; do not fabricate any.

## Product Principles

1. Record first, plan second — the plan follows real historical pace, not the reverse.
2. Weekly, half-hour granularity is the right planning unit; clock-time scheduling is explicitly rejected as the failure mode this product exists to fix.
3. The AI's job is to reality-check the user's own estimates against their own history, not to generate generic productivity advice.
4. Built and used solo, for the founder's own overlapping commitments — evidence of use should stay understated and honest, never inflated into marketing claims.

## Accessibility & Inclusion

No project-specific accessibility requirement established beyond the standard bar; not raised by the founder.

---

_Written 2026-08-08 from existing repo evidence (AGENTS.md, requirement.md, prior session context) under a same-day submission deadline, without a fresh interview round — the founder should flag anything above that's wrong or has changed._
