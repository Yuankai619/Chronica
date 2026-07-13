import { describe, expect, it } from "vitest";
import {
  categoryPaletteIndex,
  parseCategoryInput,
  sortCategories,
  type Category,
} from "./categories";

function category(partial: Partial<Category>): Category {
  return {
    id: "id",
    user_id: "user",
    name: "Name",
    description: null,
    archived_at: null,
    created_at: "",
    updated_at: "",
    ...partial,
  };
}

describe("parseCategoryInput", () => {
  it("accepts a valid input and trims fields", () => {
    const result = parseCategoryInput({
      name: "  Reading ",
      description: "  books  ",
    });
    expect(result.ok && result.input).toEqual({
      name: "Reading",
      description: "books",
    });
  });

  it("normalizes an empty description to null", () => {
    const result = parseCategoryInput({
      name: "Reading",
      description: "   ",
    });
    expect(result.ok ? result.input.description : undefined).toBeNull();
  });

  it("rejects an empty name", () => {
    expect(parseCategoryInput({ name: " ", description: "" }).ok).toBe(false);
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
