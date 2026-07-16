// Admin categories: /admin/categories
// All catalog categories with product counts and parent, plus create/edit/delete.

import type { Metadata } from "next";
import Link from "next/link";
import { listAdminCategories } from "@/src/lib/admin";
import { deleteCategory } from "@/app/admin/actions";
import { DataTable, Thead, Th, Tbody } from "../_components/DataTable";
import EmptyState from "../_components/EmptyState";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Categories — FirstStop Admin" };

const FLASH: Record<string, { tone: "ok" | "err"; text: string }> = {
  "category-created": { tone: "ok", text: "Category created." },
  "category-updated": { tone: "ok", text: "Category updated." },
  "category-deleted": { tone: "ok", text: "Category deleted." },
  "category-in-use": {
    tone: "err",
    text: "That category still has products or subcategories, so it can't be deleted.",
  },
};

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ flash?: string }>;
}) {
  const { flash } = await searchParams;
  const categories = await listAdminCategories();
  const flashMsg = flash ? FLASH[flash] : undefined;

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Categories</h1>
          <p className="mt-1 text-sm text-slate-500">Organise the catalog into categories and subcategories.</p>
        </div>
        <Link
          href="/admin/categories/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          New category
        </Link>
      </div>

      {flashMsg && (
        <div
          className={`mb-5 rounded-lg border px-4 py-2.5 text-sm ${
            flashMsg.tone === "ok"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {flashMsg.text}
        </div>
      )}

      {categories.length === 0 ? (
        <EmptyState
          title="No categories yet"
          description="Create a category to group related products."
          actionLabel="New category"
          actionHref="/admin/categories/new"
        />
      ) : (
        <DataTable>
          <Thead>
            <tr>
              <Th>Name</Th>
              <Th>Slug</Th>
              <Th>Parent</Th>
              <Th className="text-right">Products</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {categories.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/categories/${c.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{c.slug}</td>
                <td className="px-4 py-3 text-slate-600">{c.parentName ?? "—"}</td>
                <td className="px-4 py-3 text-right text-slate-600">{c.productCount}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/admin/products?q=${encodeURIComponent(c.name)}`}
                      className="font-medium text-slate-600 hover:underline"
                    >
                      View products
                    </Link>
                    <Link href={`/admin/categories/${c.id}`} className="font-medium text-blue-600 hover:underline">
                      Edit
                    </Link>
                    <form action={deleteCategory.bind(null, c.id)}>
                      <button
                        type="submit"
                        disabled={c.productCount > 0}
                        title={c.productCount > 0 ? "Has products — reassign them first" : undefined}
                        className="font-medium text-rose-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </Tbody>
        </DataTable>
      )}
    </div>
  );
}
