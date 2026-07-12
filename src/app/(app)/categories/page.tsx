import { createClient } from "@/lib/supabase/server";
import { sortCategories } from "@/lib/categories";
import { CategoryManager } from "@/components/category-manager";

export const metadata = { title: "Categories — Chronica" };

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("*");

  if (error) {
    return (
      <main>
        <h1 className="page-title">Categories</h1>
        <p className="muted">Failed to load categories: {error.message}</p>
      </main>
    );
  }

  return (
    <main>
      <h1 className="page-title">Categories</h1>
      <CategoryManager categories={sortCategories(data ?? [])} />
    </main>
  );
}
