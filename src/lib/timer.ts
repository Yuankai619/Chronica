/**
 * Pure timer domain logic. Timer truth lives in server-side timestamps;
 * these helpers turn a running session into elapsed time and, on stop or
 * reconciliation, into a time-entry payload.
 */

export const DEFAULT_CAP_MINUTES = 240;

export interface RunningSession {
  started_at: string;
  cap_minutes: number;
  expected_minutes: number | null;
}

/** Whole minutes elapsed since the session started (>= 0, floored). */
export function elapsedMinutes(session: RunningSession, now: Date): number {
  const started = new Date(session.started_at).getTime();
  return Math.max(0, Math.floor((now.getTime() - started) / 60_000));
}

/** True once the session has reached its hard duration cap. */
export function isCapExceeded(session: RunningSession, now: Date): boolean {
  return elapsedMinutes(session, now) >= session.cap_minutes;
}

export interface StopResult {
  /** Minutes to record; capped at the session's hard cap. */
  durationMinutes: number;
  /** Set when the cap was hit — the entry must be flagged for review. */
  needsConfirmation: boolean;
}

/**
 * Computes the entry to save when a session stops (user action, switch to
 * another category, or cap reconciliation after the browser was closed).
 * Sessions stopped within the first minute round up to 1 minute.
 */
export function settleSession(session: RunningSession, now: Date): StopResult {
  const elapsed = elapsedMinutes(session, now);
  if (elapsed >= session.cap_minutes) {
    return { durationMinutes: session.cap_minutes, needsConfirmation: true };
  }
  return { durationMinutes: Math.max(1, elapsed), needsConfirmation: false };
}

/** Minutes until the expected-duration reminder; null when no expectation set. */
export function minutesUntilExpected(
  session: RunningSession,
  now: Date,
): number | null {
  if (session.expected_minutes === null) return null;
  return session.expected_minutes - elapsedMinutes(session, now);
}
