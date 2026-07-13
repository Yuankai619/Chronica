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
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog, useConfirm } from "@/components/ui/confirm-dialog";

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
    <form action={submit} className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Input
          name="name"
          placeholder="Category name"
          defaultValue={category?.name}
          maxLength={100}
          required
        />
        <Select
          name="category_group"
          defaultValue={category?.category_group ?? "core"}
          aria-label="Group"
          className="sm:w-44"
        >
          {CATEGORY_GROUPS.map((g) => (
            <option key={g} value={g}>
              {CATEGORY_GROUP_LABELS[g]}
            </option>
          ))}
        </Select>
      </div>
      <Textarea
        name="description"
        placeholder="Description (context for the AI; only shown here)"
        defaultValue={category?.description ?? ""}
        rows={2}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {category ? "Save" : "Add category"}
        </Button>
        {onDone ? (
          <Button variant="ghost" type="button" onClick={onDone}>
            Cancel
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </form>
  );
}

function CategoryRow({ category }: { category: Category }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();
  const archived = category.archived_at !== null;

  if (editing) {
    return (
      <li className="border-b border-hairline py-4">
        <CategoryForm category={category} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li
      className={`flex flex-col justify-between gap-2 border-b border-hairline py-3 sm:flex-row sm:items-start sm:gap-4 ${archived ? "opacity-50" : ""}`}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{category.name}</span>
          <Badge variant={category.category_group}>
            {CATEGORY_GROUP_LABELS[category.category_group]}
          </Badge>
          {archived ? <Badge>archived</Badge> : null}
        </div>
        {category.description ? (
          <span className="text-sm text-muted">{category.description}</span>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-1">
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              if (archived) {
                await unarchiveCategory(category.id);
              } else {
                await archiveCategory(category.id);
              }
            })
          }
        >
          {archived ? "Unarchive" : "Archive"}
        </Button>
        <Button
          variant="danger"
          size="sm"
          disabled={pending}
          onClick={() =>
            confirm.request(() =>
              startTransition(async () => {
                await deleteCategory(category.id);
              }),
            )
          }
        >
          Delete
        </Button>
      </div>
      <ConfirmDialog
        open={confirm.open}
        title={`Delete "${category.name}"?`}
        description="If it has time entries it will be archived instead, keeping history intact."
        onConfirm={confirm.confirm}
        onCancel={confirm.cancel}
      />
    </li>
  );
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardTitle>New category</CardTitle>
        <CategoryForm />
      </Card>
      {categories.length === 0 ? (
        <p className="text-sm text-muted">
          No categories yet — add your first one above.
        </p>
      ) : (
        <ul className="flex flex-col">
          {categories.map((c) => (
            <CategoryRow key={c.id} category={c} />
          ))}
        </ul>
      )}
    </div>
  );
}
