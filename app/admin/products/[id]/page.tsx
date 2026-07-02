// Edit product: /admin/products/[id]

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminProduct } from "@/src/lib/admin";
import { getCategories, getBrands } from "@/src/lib/products";
import { updateProduct } from "@/app/admin/actions";
import ProductForm from "@/app/admin/ProductForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit product — FirstStop Admin" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories, brands] = await Promise.all([
    getAdminProduct(id),
    getCategories(),
    getBrands(),
  ]);
  if (!product) notFound();

  return (
    <div className="p-8">
      <nav className="mb-2 text-sm text-slate-500">
        <Link href="/admin/products" className="hover:text-slate-900">Products</Link>
        <span className="mx-1 text-slate-300">/</span>
        <span className="text-slate-700">{product.name}</span>
      </nav>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">Edit product</h1>

      <ProductForm
        action={updateProduct.bind(null, product.id)}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        brands={brands.map((b) => ({ id: b.id, name: b.name }))}
        defaults={{
          name: product.name,
          slug: product.slug,
          description: product.description,
          price: product.price.toString(),
          stock: product.stock,
          featured: product.featured,
          categoryId: product.categoryId,
          brandId: product.brandId,
          imageUrl: product.images[0]?.url ?? "",
        }}
        submitLabel="Save changes"
      />
    </div>
  );
}
