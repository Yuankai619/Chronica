import type { CategoryGroup, Tables } from "@/lib/database.types";

export type Category = Tables<"categories">;

export const CATEGORY_GROUPS: readonly CategoryGroup[] = [
  "core",
  "supportive",
  "social",
  "rest",
] as const;

export const CATEGORY_GROUP_LABELS: Record<CategoryGroup, string> = {
  core: "Core Work",
  supportive: "Supportive Work",
  social: "Social Work",
  rest: "Rest",
};

/** Core + Supportive form Lyubishchev's "effective work time". */
export function isEffectiveWork(group: CategoryGroup): boolean {
  return group === "core" || group === "supportive";
}

export interface CategoryInput {
  name: string;
  category_group: CategoryGroup;
  description: string | null;
}

/** Validates raw form values; returns the parsed input or an error message. */
export function parseCategoryInput(values: {
  name: unknown;
  category_group: unknown;
  description: unknown;
}): { ok: true; input: CategoryInput } | { ok: false; error: string } {
  const name = typeof values.name === "string" ? values.name.trim() : "";
  if (name.length === 0) return { ok: false, error: "Name is required." };
  if (name.length > 100)
    return { ok: false, error: "Name must be at most 100 characters." };

  const group = values.category_group;
  if (
    typeof group !== "string" ||
    !CATEGORY_GROUPS.includes(group as CategoryGroup)
  ) {
    return { ok: false, error: "A valid group is required." };
  }

  const rawDescription =
    typeof values.description === "string" ? values.description.trim() : "";

  return {
    ok: true,
    input: {
      name,
      category_group: group as CategoryGroup,
      description: rawDescription.length > 0 ? rawDescription : null,
    },
  };
}

/** Sorts categories by group order, then name; active before archived. */
export function sortCategories(categories: Category[]): Category[] {
  return categories.toSorted((a, b) => {
    const archived =
      Number(a.archived_at !== null) - Number(b.archived_at !== null);
    if (archived !== 0) return archived;
    const group =
      CATEGORY_GROUPS.indexOf(a.category_group) -
      CATEGORY_GROUPS.indexOf(b.category_group);
    if (group !== 0) return group;
    return a.name.localeCompare(b.name);
  });
}
