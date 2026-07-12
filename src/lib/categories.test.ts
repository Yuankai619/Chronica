import { describe, expect, it } from "vitest";
import {
  isEffectiveWork,
  parseCategoryInput,
  sortCategories,
  type Category,
} from "./categories";

function category(partial: Partial<Category>): Category {
  return {
    id: "id",
    user_id: "user",
    name: "Name",
    category_group: "core",
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
      category_group: "core",
      description: "  books  ",
    });
    expect(result.ok && result.input).toEqual({
      name: "Reading",
      category_group: "core",
      description: "books",
    });
  });

  it("normalizes an empty description to null", () => {
    const result = parseCategoryInput({
      name: "Reading",
      category_group: "rest",
      description: "   ",
    });
    expect(result.ok ? result.input.description : undefined).toBeNull();
  });

  it("rejects an empty name", () => {
    expect(
      parseCategoryInput({ name: " ", category_group: "core", description: "" })
        .ok,
    ).toBe(false);
  });

  it("rejects an unknown group", () => {
    expect(
      parseCategoryInput({
        name: "Reading",
        category_group: "hobby",
        description: "",
      }).ok,
    ).toBe(false);
  });
});

describe("isEffectiveWork", () => {
  it("counts core and supportive only", () => {
    expect(isEffectiveWork("core")).toBe(true);
    expect(isEffectiveWork("supportive")).toBe(true);
    expect(isEffectiveWork("social")).toBe(false);
    expect(isEffectiveWork("rest")).toBe(false);
  });
});

describe("sortCategories", () => {
  it("orders by group, then name, archived last", () => {
    const sorted = sortCategories([
      category({ id: "1", name: "Zeta", category_group: "rest" }),
      category({
        id: "2",
        name: "Beta",
        category_group: "core",
        archived_at: "x",
      }),
      category({ id: "3", name: "Alpha", category_group: "core" }),
      category({ id: "4", name: "Mail", category_group: "supportive" }),
    ]);
    expect(sorted.map((c) => c.id)).toEqual(["3", "4", "1", "2"]);
  });
});
