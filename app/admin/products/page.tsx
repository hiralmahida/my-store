// Admin product list: /admin/products
// Status tabs, search, sortable columns, pagination, bulk actions.

import type { Metadata } from "next";
import Link from "next/link";
import { listAdminProducts, LOW_STOCK_THRESHOLD } from "@/src/lib/admin";
import ProductsTable from "./ProductsTable";
import AdminPagination from "../_components/AdminPagination";
import EmptyState from "../_components/EmptyState";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Products — FirstStop Admin" };

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; sort?: string; dir?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status ?? "all";
  const q = (sp.q ?? "").trim();

  const result = await listAdminProducts({
    status: status !== "all" ? status : undefined,
    q,
    sort: sp.sort,
    dir: sp.dir,
    page: sp.page ? Number(sp.page) : 1,
  });

  const clean = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(o)) if (v) p.set(k, v);
    return p.toString();
  };
  const statusParam = status !== "all" ? status : undefined;

  const tabs: { key: string; label: string; count: number }[] = [
    { key: "all", label: "All", count: result.counts.all },
    { key: "ACTIVE", label: "Active", count: result.counts.active },
    { key: "DRAFT", label: "Draft", count: result.counts.draft },
    { key: "ARCHIVED", label: "Archived", count: result.counts.archived },
  ];

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Products <span className="text-base font-normal text-slate-400">({result.total})</span>
        </h1>
        <Link
          href="/admin/products/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          + New product
        </Link>
      </div>

      {/* Status tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => {
          const active = t.key === status;
          const href = `/admin/products?${clean({ status: t.key !== "all" ? t.key : undefined, q: q || undefined })}`;
          return (
            <Link
              key={t.key}
              href={href}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                active ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t.label} <span className={active ? "text-slate-300" : "text-slate-400"}>{t.count}</span>
            </Link>
          );
        })}
      </div>

      {/* Search */}
      <form action="/admin/products" className="mb-5 flex max-w-md items-center gap-2">
        {statusParam && <input type="hidden" name="status" value={statusParam} />}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search name, slug or brand…"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Search
        </button>
      </form>

      {result.rows.length === 0 ? (
        <EmptyState
          title={q ? `No products match “${q}”` : "No products in this view"}
          description="Try a different tab or search term, or add a new product."
        />
      ) : (
        <>
          <ProductsTable
            rows={result.rows}
            basePath="/admin/products"
            currentSort={sp.sort}
            currentDir={sp.dir}
            extraParams={{ status: statusParam, q: q || undefined }}
            lowStockThreshold={LOW_STOCK_THRESHOLD}
          />
          <AdminPagination
            basePath="/admin/products"
            page={result.page}
            totalPages={result.totalPages}
            totalItems={result.total}
            extraParams={{ status: statusParam, q: q || undefined, sort: sp.sort, dir: sp.dir }}
          />
        </>
      )}

      <p className="mt-3 text-xs text-slate-400">
        Deleting a product that appears in past orders keeps its history and just archives it
        (removed from the catalog, stock set to 0).
      </p>
    </div>
  );
}
