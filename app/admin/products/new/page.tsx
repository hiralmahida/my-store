// Create product: /admin/products/new

import type { Metadata } from "next";
import Link from "next/link";
import { getCategories, getBrands } from "@/src/lib/products";
import { createProduct } from "@/app/admin/actions";
import ProductForm from "@/app/admin/ProductForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New product — FirstStop Admin" };

export default async function NewProductPage() {
  const [categories, brands] = await Promise.all([getCategories(), getBrands()]);

  return (
    <div className="p-8">
      <nav className="mb-2 text-sm text-slate-500">
        <Link href="/admin/products" className="hover:text-slate-900">Products</Link>
        <span className="mx-1 text-slate-300">/</span>
        <span className="text-slate-700">New</span>
      </nav>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">New product</h1>

      <ProductForm
        action={createProduct}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        brands={brands.map((b) => ({ id: b.id, name: b.name }))}
        submitLabel="Create product"
      />
    </div>
  );
}
