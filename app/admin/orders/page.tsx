// Admin orders list: /admin/orders
// Saved-view tabs, search, sortable columns, pagination, bulk actions, export.

import type { Metadata } from "next";
import Link from "next/link";
import { listAdminOrders, ORDER_VIEWS } from "@/src/lib/admin";
import OrdersTable, { type OrderRowData } from "./OrdersTable";
import AdminPagination from "../_components/AdminPagination";
import EmptyState from "../_components/EmptyState";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Orders — FirstStop Admin" };

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string; sort?: string; dir?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const view = sp.view ?? "all";
  const q = (sp.q ?? "").trim();

  const result = await listAdminOrders({
    view,
    q,
    sort: sp.sort,
    dir: sp.dir,
    page: sp.page ? Number(sp.page) : 1,
  });

  const rows: OrderRowData[] = result.rows.map((o) => ({
    id: o.id,
    shortId: o.id.slice(-8).toUpperCase(),
    customerName: o.customerName,
    total: Number(o.total.toString()),
    status: o.status,
    itemsCount: o._count.items,
    date: o.createdAt.toLocaleDateString("en-GB"),
    tags: o.tags,
  }));

  const clean = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(o)) if (v) p.set(k, v);
    return p.toString();
  };
  const viewParam = view !== "all" ? view : undefined;
  const exportQs = clean({ view: viewParam, q: q || undefined, sort: sp.sort, dir: sp.dir });

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Orders</h1>
        <a
          href={`/admin/orders/export${exportQs ? `?${exportQs}` : ""}`}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Export CSV
        </a>
      </div>

      {/* Saved views */}
      <div className="mb-4 flex flex-wrap gap-2">
        {ORDER_VIEWS.map((v) => {
          const active = v.key === view;
          const href = `/admin/orders?${clean({ view: v.key !== "all" ? v.key : undefined, q: q || undefined })}`;
          return (
            <Link
              key={v.key}
              href={href}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                active ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {v.label}
            </Link>
          );
        })}
      </div>

      {/* Search */}
      <form action="/admin/orders" className="mb-5 flex max-w-md items-center gap-2">
        {viewParam && <input type="hidden" name="view" value={viewParam} />}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search order #, customer name or email…"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Search
        </button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title={q ? `No orders match “${q}”` : "No orders in this view"}
          description="Try a different view or search term."
        />
      ) : (
        <>
          <OrdersTable
            rows={rows}
            basePath="/admin/orders"
            currentSort={sp.sort}
            currentDir={sp.dir}
            extraParams={{ view: viewParam, q: q || undefined }}
          />
          <AdminPagination
            basePath="/admin/orders"
            page={result.page}
            totalPages={result.totalPages}
            totalItems={result.total}
            extraParams={{ view: viewParam, q: q || undefined, sort: sp.sort, dir: sp.dir }}
          />
        </>
      )}
    </div>
  );
}
