import { describe, expect, it } from "vitest";
import { decayedConfidence, selectMemoriesToPrune } from "./agent-memory";

const NOW = new Date("2026-08-22T00:00:00Z");

describe("decayedConfidence", () => {
  it("returns the base confidence when just confirmed", () => {
    expect(decayedConfidence(0.8, "2026-08-22T00:00:00Z", NOW)).toBeCloseTo(
      0.8,
    );
  });

  it("halves after one half-life (60 days)", () => {
    expect(decayedConfidence(0.8, "2026-06-23T00:00:00Z", NOW)).toBeCloseTo(
      0.4,
      1,
    );
  });

  it("never drops below the floor", () => {
    expect(decayedConfidence(0.8, "2020-01-01T00:00:00Z", NOW)).toBeCloseTo(
      0.05,
      2,
    );
  });
});

describe("selectMemoriesToPrune", () => {
  it("prunes nothing under the cap", () => {
    const memories = [
      { id: "a", confidence: 0.5, lastConfirmedAt: NOW.toISOString() },
    ];
    expect(selectMemoriesToPrune(memories, 5, NOW)).toEqual([]);
  });

  it("drops the lowest-confidence memories first once over the cap", () => {
    const memories = [
      { id: "high", confidence: 0.9, lastConfirmedAt: NOW.toISOString() },
      { id: "mid", confidence: 0.6, lastConfirmedAt: NOW.toISOString() },
      { id: "stale", confidence: 0.6, lastConfirmedAt: "2020-01-01T00:00:00Z" },
    ];
    expect(selectMemoriesToPrune(memories, 2, NOW)).toEqual(["stale"]);
  });
});
