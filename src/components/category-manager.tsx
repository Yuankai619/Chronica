"use client";

import { useState, useTransition } from "react";
import {
  archiveCategory,
  createCategory,
  deleteCategory,
  unarchiveCategory,
  updateCategory,
} from "@/app/(app)/categories/actions";
import {
  CATEGORY_GROUP_LABELS,
  CATEGORY_GROUPS,
  type Category,
} from "@/lib/categories";

function CategoryForm({
  category,
  onDone,
}: {
  category?: Category;
  onDone?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = category
        ? await updateCategory(category.id, formData)
        : await createCategory(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        onDone?.();
      }
    });
  }

  return (
    <form action={submit} className="category-form">
      <input
        name="name"
        placeholder="Category name"
        defaultValue={category?.name}
        maxLength={100}
        required
      />
      <select
        name="category_group"
        defaultValue={category?.category_group ?? "core"}
        aria-label="Group"
      >
        {CATEGORY_GROUPS.map((g) => (
          <option key={g} value={g}>
            {CATEGORY_GROUP_LABELS[g]}
          </option>
        ))}
      </select>
      <textarea
        name="description"
        placeholder="Description (context for the AI; only shown here)"
        defaultValue={category?.description ?? ""}
        rows={2}
      />
      <div className="category-form-actions">
        <button className="button" type="submit" disabled={pending}>
          {category ? "Save" : "Add category"}
        </button>
        {onDone ? (
          <button className="link-button" type="button" onClick={onDone}>
            Cancel
          </button>
        ) : null}
      </div>
      {error ? <p className="form-error">{error}</p> : null}
    </form>
  );
}

function CategoryRow({ category }: { category: Category }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const archived = category.archived_at !== null;

  if (editing) {
    return (
      <li className="category-row">
        <CategoryForm category={category} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className={`category-row${archived ? " category-archived" : ""}`}>
      <div className="category-row-main">
        <span className="category-name">{category.name}</span>
        <span className="category-group">
          {CATEGORY_GROUP_LABELS[category.category_group]}
          {archived ? " · archived" : ""}
        </span>
        {category.description ? (
          <span className="category-description">{category.description}</span>
        ) : null}
      </div>
      <div className="category-row-actions">
        <button className="link-button" onClick={() => setEditing(true)}>
          Edit
        </button>
        {archived ? (
          <button
            className="link-button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await unarchiveCategory(category.id);
              })
            }
          >
            Unarchive
          </button>
        ) : (
          <button
            className="link-button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await archiveCategory(category.id);
              })
            }
          >
            Archive
          </button>
        )}
        <button
          className="link-button link-danger"
          disabled={pending}
          onClick={() => {
            if (!confirm(`Delete "${category.name}"?`)) return;
            startTransition(async () => {
              await deleteCategory(category.id);
            });
          }}
        >
          Delete
        </button>
      </div>
    </li>
  );
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  return (
    <div className="category-manager">
      <CategoryForm />
      {categories.length === 0 ? (
        <p className="muted">No categories yet — add your first one above.</p>
      ) : (
        <ul className="category-list">
          {categories.map((c) => (
            <CategoryRow key={c.id} category={c} />
          ))}
        </ul>
      )}
    </div>
  );
}
