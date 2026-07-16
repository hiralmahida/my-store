// Edit category: /admin/categories/[id]

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "../../_components/Breadcrumbs";
import CategoryForm from "../CategoryForm";
import { updateCategory } from "@/app/admin/actions";
import { getAdminCategory, listAdminCategories } from "@/src/lib/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit category — FirstStop Admin" };

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [category, categories] = await Promise.all([getAdminCategory(id), listAdminCategories()]);
  if (!category) notFound();

  // A category can't be its own parent, so exclude it from the options.
  const parents = categories.filter((c) => c.id !== id).map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumbs items={[{ label: "Categories", href: "/admin/categories" }, { label: category.name }]} />
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">Edit category</h1>
      <CategoryForm
        action={updateCategory.bind(null, category.id)}
        parents={parents}
        defaults={{
          name: category.name,
          slug: category.slug,
          image: category.image ?? "",
          parentId: category.parentId ?? "",
        }}
        submitLabel="Save category"
      />
    </div>
  );
}
