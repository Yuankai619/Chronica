/** PROTOTYPE ONLY (#64) — shared between the server page and the switcher. */

export const PLAN_VARIANTS = ["A", "B", "C"] as const;

export const PLAN_VARIANT_LABELS: Record<string, string> = {
  A: "Handle + always-on icons",
  B: "Hover capability",
  C: "Tap to reveal action row",
};
