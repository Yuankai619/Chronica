/** PROTOTYPE ONLY (#63) — shared between the server page and the switcher. */

export const VARIANTS = ["A", "B", "C"] as const;

export const VARIANT_LABELS: Record<string, string> = {
  A: "Timeline rail",
  B: "Content first",
  C: "Duration led",
};
