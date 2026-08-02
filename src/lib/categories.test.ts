import { describe, expect, it } from "vitest";
import {
  categoryPaletteIndex,
  excludedCategoryIds,
  parseCategoryInput,
  sortCategories,
  type Category,
} from "./categories";

function category(partial: Partial<Category>): Category {
  return {
    id: "id",
    user_id: "user",
    name: "Name",
    color: null,
    description: null,
    archived_at: null,
    excluded_from_totals: false,
    created_at: "",
    updated_at: "",
    ...partial,
  };
}

describe("excludedCategoryIds", () => {
  it("collects only the flagged ids", () => {
    const ids = excludedCategoryIds([
      category({ id: "sleep", excluded_from_totals: true }),
      category({ id: "work" }),
      category({ id: "nap", excluded_from_totals: true }),
    ]);
    expect([...ids].toSorted()).toEqual(["nap", "sleep"]);
  });

  it("is empty when nothing is flagged", () => {
    expect(excludedCategoryIds([category({ id: "work" })]).size).toBe(0);
  });
});

describe("parseCategoryInput", () => {
  it("accepts a valid input and trims fields", () => {
    const result = parseCategoryInput({
      name: "  Reading ",
      color: "#F0B429",
      description: "  books  ",
      excludedFromTotals: null,
    });
    expect(result.ok && result.input).toEqual({
      name: "Reading",
      color: "#f0b429",
      description: "books",
      excluded_from_totals: false,
    });
  });

  it("reads the checkbox by presence, not truthiness", () => {
    const checked = parseCategoryInput({
      name: "Sleep",
      color: "",
      description: "",
      excludedFromTotals: "on",
    });
    expect(checked.ok && checked.input.excluded_from_totals).toBe(true);

    // Unchecked boxes are simply absent from the form data.
    const unchecked = parseCategoryInput({
      name: "Sleep",
      color: "",
      description: "",
      excludedFromTotals: null,
    });
    expect(unchecked.ok && unchecked.input.excluded_from_totals).toBe(false);
  });

  it("normalizes an empty description to null", () => {
    const result = parseCategoryInput({
      name: "Reading",
      color: "",
      description: "   ",
      excludedFromTotals: null,
    });
    expect(result.ok ? result.input.description : undefined).toBeNull();
  });

  it("rejects an empty name", () => {
    expect(
      parseCategoryInput({
        name: " ",
        color: "",
        description: "",
        excludedFromTotals: null,
      }).ok,
    ).toBe(false);
  });
});

describe("categoryPaletteIndex", () => {
  it("is stable and within the palette", () => {
    const a = categoryPaletteIndex("some-id");
    expect(a).toBe(categoryPaletteIndex("some-id"));
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(6);
  });
});

describe("sortCategories", () => {
  it("orders by name, archived last", () => {
    const sorted = sortCategories([
      category({ id: "1", name: "Zeta" }),
      category({ id: "2", name: "Beta", archived_at: "x" }),
      category({ id: "3", name: "Alpha" }),
      category({ id: "4", name: "Mail" }),
    ]);
    expect(sorted.map((c) => c.id)).toEqual(["3", "4", "1", "2"]);
  });
});
