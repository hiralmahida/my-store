// Create category: /admin/categories/new

import type { Metadata } from "next";
import Breadcrumbs from "../../_components/Breadcrumbs";
import CategoryForm from "../CategoryForm";
import { createCategory } from "@/app/admin/actions";
import { listAdminCategories } from "@/src/lib/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New category — FirstStop Admin" };

export default async function NewCategoryPage() {
  const categories = await listAdminCategories();

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumbs items={[{ label: "Categories", href: "/admin/categories" }, { label: "New" }]} />
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">New category</h1>
      <CategoryForm
        action={createCategory}
        parents={categories.map((c) => ({ id: c.id, name: c.name }))}
        submitLabel="Create category"
      />
    </div>
  );
}
