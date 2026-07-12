import { describe, expect, it } from "vitest";
import {
  elapsedMinutes,
  isCapExceeded,
  minutesUntilExpected,
  settleSession,
} from "./timer";

const startedAt = "2026-07-13T08:00:00.000Z";

function session(partial?: Partial<Parameters<typeof settleSession>[0]>) {
  return {
    started_at: startedAt,
    cap_minutes: 240,
    expected_minutes: null,
    ...partial,
  };
}

function at(minutesLater: number): Date {
  return new Date(Date.parse(startedAt) + minutesLater * 60_000);
}

describe("elapsedMinutes", () => {
  it("floors partial minutes", () => {
    expect(elapsedMinutes(session(), at(29.9))).toBe(29);
  });

  it("never goes negative on clock skew", () => {
    expect(elapsedMinutes(session(), at(-5))).toBe(0);
  });
});

describe("settleSession", () => {
  it("records the elapsed time under the cap", () => {
    expect(settleSession(session(), at(90))).toEqual({
      durationMinutes: 90,
      needsConfirmation: false,
    });
  });

  it("rounds sub-minute sessions up to one minute", () => {
    expect(settleSession(session(), at(0.5)).durationMinutes).toBe(1);
  });

  it("caps and flags a session that exceeded the hard cap", () => {
    // e.g. browser closed overnight: 600 minutes elapsed, cap 240.
    expect(settleSession(session(), at(600))).toEqual({
      durationMinutes: 240,
      needsConfirmation: true,
    });
  });

  it("caps exactly at the boundary", () => {
    expect(settleSession(session(), at(240))).toEqual({
      durationMinutes: 240,
      needsConfirmation: true,
    });
  });
});

describe("isCapExceeded", () => {
  it("is false before and true at the cap", () => {
    expect(isCapExceeded(session(), at(239))).toBe(false);
    expect(isCapExceeded(session(), at(240))).toBe(true);
  });
});

describe("minutesUntilExpected", () => {
  it("is null without an expected duration", () => {
    expect(minutesUntilExpected(session(), at(10))).toBeNull();
  });

  it("counts down and goes negative after the expectation", () => {
    const s = session({ expected_minutes: 30 });
    expect(minutesUntilExpected(s, at(10))).toBe(20);
    expect(minutesUntilExpected(s, at(45))).toBe(-15);
  });
});
