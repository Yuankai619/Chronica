# Chronica (working title) — Lyubishchev Time Management Web App

## Summary

A personal web app for time management based on Lyubishchev's time-statistics method. The user records how long each activity takes by category, sets weekly time budgets per category, and reviews live budget-vs-actual settlements. An AI assistant (Phase 2) reviews each week, checks plans against the user's real historical pace, and builds long-term memory of the user's working patterns. Microsoft To Do tasks can be attached to time entries for task-level time-cost tracking.

Delivery is split into two phases:

- **Phase 1 (MVP):** categories, timer, quick add, editing, weekly budgets, live settlement, manual rollover, unrecorded-time visibility, To Do integration, task cumulative time.
- **Phase 2:** AI Retro, estimation accuracy metric, personal principles check, monthly and annual summaries.

---

## User Stories

- As a user, I want to start a timer on a category with one click, so that recording an activity takes almost no effort.
- As a user, I want to set an expected duration when I start a timer and get reminded when it is up, so that I never forget a running timer.
- As a user, I want to quickly log a past activity in under 20 seconds, so that forgetting to start the timer does not break my records.
- As a user, I want to set weekly hour budgets per category and see actual vs budget at any time, so that I know where I am over- or under-spending my time.
- As a user, I want to decide manually, at weekly planning time, whether to carry each category's surplus or deficit into the next week, so that I stay in control of cross-week adjustments.
- As a user, I want to mark categories as Core / Supportive / Social / Rest, so that the system can show my "effective work time" (Core + Supportive) the way Lyubishchev tracked it.
- As a user, I want to see how much of my daily recording target is still unrecorded, so that invisible time leaks become visible.
- As a user, I want to attach a Microsoft To Do task to a time entry, so that I can see the cumulative total time a task has cost me across days.
- As a user, I want to trigger an AI Retro at weekly planning, so that I get an honest analysis of last week and a reality check on next week's plan. (Phase 2)
- As a user, I want the AI to remember my long-term patterns (real pace, recurring overruns), so that its advice improves over time. (Phase 2)

---

## Requirements

### Categories (Phase 1)

- The system must support creating, editing, archiving, and deleting categories.
- Each category must have: name, group (Core Work / Supportive Work / Social Work / Rest), and an optional description.
- The category description must be visible only in the category management (admin) area, never on the execution/timer interface. Its purpose is to give the AI context about what the category means.
- Deleting a category with existing time entries must archive it instead of hard-deleting; historical statistics must remain intact.

### Timer (Phase 1)

- The system must let the user start a timer by picking a category; optionally the user can also attach a Microsoft To Do task and set an expected duration.
- Only one timer can run at a time. Starting a new timer must automatically stop and save the current one.
- When the expected duration is reached, the system must send a browser notification. The timer must keep running.
- After the expected duration passes, the system must send a check-in browser notification every 15 minutes asking whether the activity is done.
- Each timer session must have a hard duration cap (default 4 hours, user-configurable). When the cap is reached, the system must automatically stop the timer, save the entry, and flag it as "needs confirmation" so the user can correct it later.
- Timer state must be based on server-side timestamps so that closing the browser does not lose or distort the session. On return, the session is reconciled: if the cap was exceeded while away, the entry is capped and flagged.

### Recording and Editing (Phase 1)

- The system must provide a quick-add form to log a past activity (category, duration, optional task, optional note) designed to be completed in under 20 seconds.
- The system must allow editing and deleting any time entry (category, duration, date, task link).
- Recording is event-plus-duration oriented. A start timestamp is stored for week attribution, but the UI does not require or emphasize "from HH:MM to HH:MM" scheduling.

### Weekly Budget and Settlement (Phase 1)

- The week starts on Monday.
- The system must let the user create a weekly plan assigning budgeted hours per category.
- The system must show a live settlement view at any time: per category, budget vs actual, with over/under difference. There is no separate "generate report" action.
- A time entry belongs to the week in which it started, even if it crosses midnight into the next week.
- The settlement view must also show effective work time (sum of Core + Supportive categories) for the week.

### Cross-Week Rollover (Phase 1)

- At weekly planning time, the system must show each category's balance for recent weeks and the historical cumulative balance.
- Carrying a surplus or deficit into the next week is a manual, per-category decision by the user during planning.
- Carried amounts are snapshotted when the plan is saved. Editing past weeks' entries afterward does not retroactively change an already-saved plan.

### Unrecorded Time (Phase 1)

- The user must be able to set a daily target of recorded hours (e.g., 14 hours per day).
- The system must show, per day and per week, recorded time vs the target, making the unrecorded gap visible.

### Microsoft To Do Integration (Phase 1)

- The user signs in with Google. A Microsoft account can additionally be linked (OAuth) purely to access To Do data; Microsoft login is not a sign-in method.
- The system must fetch To Do task title, description, and due date.
- Integration is read-only. Tasks are an optional annotation on time entries; the timer's primary subject is always the category.
- The system must show cumulative time per task across all entries and days (the "time-cost database").

### AI Retro and Planning Advice (Phase 2)

- AI Retro is triggered manually by the user (e.g., a button during weekly planning). It is not generated automatically.
- The Retro must analyze the past week's records: where budgets were exceeded or missed, notable patterns, and concrete adjustment suggestions.
- The Retro must include a reality check for the next plan: using historical actuals and estimation accuracy, warn when the user's planned budget for a category is likely overestimated.
- The AI must be able to read category descriptions, linked To Do task titles/descriptions, and time spent, to understand what the user actually worked on.
- The AI must maintain long-term memory of the user's patterns (real pace per category/task type, recurring issues) that persists across weeks.

### Estimation Accuracy (Phase 2)

- The system must compute, per category, a historical accuracy metric of budget vs actual (e.g., average over/under ratio over past weeks) and visualize it.
- This metric feeds the AI reality check.

### Personal Principles (Phase 2)

- The user can maintain a list of personal time-use principles (free text, e.g., "no urgent tasks", "stop when tired").
- During Retro, the AI must check the week's records against these principles and point out likely violations.

### Monthly and Annual Summaries (Phase 2)

- The system must provide monthly and annual summary views: total hours per category and group, effective work time trends, and activity counts (e.g., number of entertainment sessions), in the spirit of Lyubishchev's yearly reports.

---

## Acceptance Criteria

### Phase 1

- [ ] Given a category exists, when the user starts a timer on it with an expected duration of 30 minutes, then a browser notification fires at 30 minutes, the timer keeps running, and check-in notifications fire every 15 minutes afterward.
- [ ] Given a timer has been running for the configured hard cap (default 4h), when the cap is reached, then the timer stops automatically, the entry is saved with the cap duration, and the entry is flagged "needs confirmation".
- [ ] Given a timer is running on category A, when the user starts a timer on category B, then the category A session is stopped and saved automatically and the category B timer starts.
- [ ] Given the user forgot to time an activity, when they use quick add with category and duration, then a time entry is created without a timer.
- [ ] Given the weekly plan has Reading = 5h and actual entries total 6h, when the user opens the settlement view mid-week, then Reading shows +1h over budget without any "generate" step.
- [ ] Given a timer starts Sunday 23:00 and stops Monday 01:00, when settlements are viewed, then the full 2h belongs to the week containing Sunday.
- [ ] Given last week ended with Reading at −2h, when the user plans the next week, then the system shows the −2h balance and the cumulative history, and only applies rollover to the categories the user explicitly chooses.
- [ ] Given a plan was saved with a rollover based on last week's numbers, when the user later edits last week's entries, then the saved plan's numbers do not change.
- [ ] Given the daily recording target is 14h and 9h are recorded today, then the dashboard shows 5h unrecorded for the day.
- [ ] Given a Microsoft account is linked, when the user starts a timer, then they can optionally pick a To Do task, and the task's cumulative total time updates when the entry is saved.
- [ ] Given a category has time entries, when the user deletes it, then it is archived and past statistics still include it.
- [ ] Given the execution/timer interface is open, then category descriptions are not visible anywhere on it.

### Phase 2

- [ ] Given at least a few weeks of data, when the user triggers AI Retro during planning, then they receive an analysis of last week and warnings for next-week budgets that historically run over.
- [ ] Given the user consistently spends 1.5x their Reading budget, when they plan 10h of Reading, then the reality check flags the likely overestimate with the historical ratio as evidence.
- [ ] Given a principle "stop working when tired" exists, when the Retro runs on a week with a 3:00 AM work session, then the AI surfaces it as a possible principle violation.
- [ ] Given a full month of data, when the user opens the monthly summary, then per-category totals, effective work time, and activity counts are shown.

---

## Edge Cases

- If browser notification permission is denied or unsupported, the system should fall back to visible in-app alerts (e.g., a persistent banner/title change) and tell the user notifications are off.
- If the browser is closed while a timer runs, the session should survive via server-side timestamps; on return the session is reconciled, and if the hard cap was exceeded it is capped and flagged.
- If the Microsoft token expires or the To Do API is unavailable, the timer and all core features should keep working; only task attachment is disabled, with a prompt to re-link the account.
- If a manually added entry overlaps in time with an existing entry, the system should warn but allow it (the method tracks durations, not exclusive time slots).
- If the user rapidly clicks "start" twice, only one session should be created.
- If AI Retro is triggered with too little data (e.g., under 2 full weeks), the AI should say so and give only limited observations instead of fabricating analysis. (Phase 2)
- If a week has no plan, the settlement view should still show actuals per category with budgets shown as unset, and planning for that week should remain possible retroactively... or simply show "no plan" state. (Default: show actuals, no over/under computation.)
- If an entry flagged "needs confirmation" is never confirmed, it still counts in statistics but keeps its flag visible in the entry list.

---

## Out of Scope

- Native mobile app and mobile push notifications. Web + RWD only; reminders rely on browser notifications.
- Two-way sync with Microsoft To Do. Read-only; nothing is written back or marked complete in To Do.
- Multi-user, sharing, or team features. Single-user personal tool.
- Calendar integration (e.g., Google Calendar) and any "HH:MM to HH:MM" schedule/timeline planning view.
- Automatic activity tracking (screen time, app usage detection). All records are user-initiated.
- Offline mode / PWA, and data export (CSV) in this version.
- Other time management methods (Pomodoro, etc.).

---

## Open Questions / Notes

- **Week start day** is fixed to Monday for now; making it configurable is deferred.
- **Category groups**: the four Lyubishchev groups (Core / Supportive / Social / Rest) are fixed. If this proves too rigid, a simpler "is core work" boolean is the fallback.
- **AI long-term memory shape** (what exactly is stored and how it is summarized over time) needs its own design pass before Phase 2 implementation.
- **Rollover snapshot vs later edits**: accepted trade-off — plans are snapshots; a small indicator showing "past week edited after planning" could be added later.
- Technical constraints stated by the owner (kept out of behavioral spec): Next.js + TypeScript, Supabase, Mastra Agent with OpenAI-standard LLM provider, Google sign-in with Microsoft account linking, unit tests required, clean software architecture. UI: minimalist, dark theme, RWD, no "AI-looking" design.
