// Admin product list: /admin/products

import type { Metadata } from "next";
import Link from "next/link";
import { listAdminProducts, LOW_STOCK_THRESHOLD } from "@/src/lib/admin";
import { deleteProduct } from "@/app/admin/actions";
import { formatQAR } from "@/src/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Products — FirstStop Admin" };

export default async function AdminProductsPage() {
  const products = await listAdminProducts();

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Products <span className="text-base font-normal text-slate-400">({products.length})</span>
        </h1>
        <Link
          href="/admin/products/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          + New product
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Featured</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.brand.name}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{p.category.name}</td>
                <td className="px-4 py-3 text-slate-900">{formatQAR(p.price)}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      p.stock <= 0
                        ? "font-semibold text-rose-600"
                        : p.stock <= LOW_STOCK_THRESHOLD
                          ? "font-semibold text-amber-600"
                          : "text-slate-700"
                    }
                  >
                    {p.stock}
                  </span>
                </td>
                <td className="px-4 py-3">{p.featured ? "★" : "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      Edit
                    </Link>
                    <form action={deleteProduct.bind(null, p.id)}>
                      <button
                        type="submit"
                        className="font-medium text-slate-400 transition hover:text-rose-600"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Deleting a product that appears in past orders keeps its history and just removes it from
        the catalog (stock set to 0).
      </p>
    </div>
  );
}
