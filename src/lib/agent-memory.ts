/** Hard ceiling on stored long-term memories; the least-confident ones age out. */
export const MAX_MEMORIES = 40;

/** Confidence halves every ~2 months without being reconfirmed. */
const HALF_LIFE_DAYS = 60;
const MIN_CONFIDENCE = 0.05;

/**
 * A memory's confidence as of `now`, decayed from its stored value based on
 * how long it's been since it was last confirmed (written or reconfirmed
 * by a Retro). Never mutates storage — this is purely a read-time view, so
 * a memory that turns out to still be true just needs `last_confirmed_at`
 * bumped to regain full weight.
 */
export function decayedConfidence(
  baseConfidence: number,
  lastConfirmedAt: string,
  now: Date = new Date(),
): number {
  const days =
    (now.getTime() - new Date(lastConfirmedAt).getTime()) / 86_400_000;
  if (days <= 0) return baseConfidence;
  const factor = Math.pow(0.5, days / HALF_LIFE_DAYS);
  return Math.max(MIN_CONFIDENCE, baseConfidence * factor);
}

export interface PrunableMemory {
  id: string;
  confidence: number;
  lastConfirmedAt: string;
}

/**
 * Ids to drop when the memory count exceeds the cap: the ones with the
 * lowest decayed confidence go first, so a memory that's stayed unconfirmed
 * the longest is the one that ages out.
 */
export function selectMemoriesToPrune(
  memories: PrunableMemory[],
  maxCount: number = MAX_MEMORIES,
  now: Date = new Date(),
): string[] {
  if (memories.length <= maxCount) return [];
  const ranked = [...memories].sort(
    (a, b) =>
      decayedConfidence(a.confidence, a.lastConfirmedAt, now) -
      decayedConfidence(b.confidence, b.lastConfirmedAt, now),
  );
  return ranked.slice(0, memories.length - maxCount).map((m) => m.id);
}
