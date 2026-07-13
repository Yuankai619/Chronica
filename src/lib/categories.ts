import type { Tables } from "@/lib/database.types";

export type Category = Tables<"categories">;

export interface CategoryInput {
  name: string;
  color: string | null;
  description: string | null;
}

/** Preset swatches offered in the category form. */
export const PRESET_COLORS = [
  "#f0b429",
  "#7cc0f5",
  "#6fd29c",
  "#d9a1e0",
  "#eba9a1",
  "#8fd5e0",
] as const;

/** Validates raw form values; returns the parsed input or an error message. */
export function parseCategoryInput(values: {
  name: unknown;
  color: unknown;
  description: unknown;
}): { ok: true; input: CategoryInput } | { ok: false; error: string } {
  const name = typeof values.name === "string" ? values.name.trim() : "";
  if (name.length === 0) return { ok: false, error: "Name is required." };
  if (name.length > 100)
    return { ok: false, error: "Name must be at most 100 characters." };

  const rawColor =
    typeof values.color === "string" ? values.color.trim().toLowerCase() : "";
  if (rawColor !== "" && !/^#[0-9a-f]{6}$/.test(rawColor)) {
    return { ok: false, error: "Color must be a hex value like #f0b429." };
  }

  const rawDescription =
    typeof values.description === "string" ? values.description.trim() : "";

  return {
    ok: true,
    input: {
      name,
      color: rawColor === "" ? null : rawColor,
      description: rawDescription.length > 0 ? rawDescription : null,
    },
  };
}

/** Sorts categories by name; active before archived. */
export function sortCategories(categories: Category[]): Category[] {
  return categories.toSorted((a, b) => {
    const archived =
      Number(a.archived_at !== null) - Number(b.archived_at !== null);
    if (archived !== 0) return archived;
    return a.name.localeCompare(b.name);
  });
}

export const CATEGORY_PALETTE_SIZE = 6;

/**
 * Deterministic palette slot for a category id, so each category keeps a
 * stable accent color across the app without any configuration.
 */
export function categoryPaletteIndex(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % CATEGORY_PALETTE_SIZE;
}
