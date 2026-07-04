// Admin inventory: /admin/inventory
// Stock levels for products + variants, inline stock adjustments, per-product
// low-stock thresholds, and a stock-change history log.

import { Fragment } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { listInventory, getStockHistory } from "@/src/lib/admin";
import { adjustStock, setLowStockThreshold } from "@/app/admin/actions";
import StatusBadge from "../_components/StatusBadge";
import AdminPagination from "../_components/AdminPagination";
import EmptyState from "../_components/EmptyState";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Inventory — FirstStop Admin" };

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "low", label: "Low stock" },
  { key: "out", label: "Out of stock" },
];

const inputCls =
  "w-16 rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const filter = sp.filter ?? "all";
  const q = (sp.q ?? "").trim();

  const [result, history] = await Promise.all([
    listInventory({ filter, q, page: sp.page ? Number(sp.page) : 1 }),
    getStockHistory(20),
  ]);

  const clean = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(o)) if (v) p.set(k, v);
    return p.toString();
  };
  const filterParam = filter !== "all" ? filter : undefined;
  const counts: Record<string, number> = { all: result.counts.all, low: result.counts.low, out: result.counts.out };

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inventory</h1>
      <p className="mt-1 text-sm text-slate-500">Stock levels, adjustments and low-stock alerts.</p>

      {/* Filter tabs */}
      <div className="mb-4 mt-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = f.key === filter;
          const href = `/admin/inventory?${clean({ filter: f.key !== "all" ? f.key : undefined, q: q || undefined })}`;
          return (
            <Link
              key={f.key}
              href={href}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                active ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {f.label} <span className={active ? "text-slate-300" : "text-slate-400"}>{counts[f.key]}</span>
            </Link>
          );
        })}
      </div>

      {/* Search */}
      <form action="/admin/inventory" className="mb-5 flex max-w-md items-center gap-2">
        {filterParam && <input type="hidden" name="filter" value={filterParam} />}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search product or brand…"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Search
        </button>
      </form>

      {result.rows.length === 0 ? (
        <EmptyState
          title={q ? `No products match “${q}”` : "Nothing to show"}
          description="Try a different filter or search term."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Set stock</th>
                <th className="px-4 py-3">Low-stock at</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {result.rows.map((p) => (
                <Fragment key={p.id}>
                  <tr className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-slate-100">
                          {p.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <div>
                          <Link href={`/admin/products/${p.id}`} className="font-medium text-blue-600 hover:underline">
                            {p.name}
                          </Link>
                          <div className="mt-0.5"><StatusBadge status={p.status} /></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          p.out ? "font-semibold text-rose-600" : p.low ? "font-semibold text-amber-600" : "text-slate-700"
                        }
                      >
                        {p.stock}
                      </span>
                      {p.out && <span className="ml-2 text-xs font-medium text-rose-500">Out</span>}
                      {p.low && <span className="ml-2 text-xs font-medium text-amber-500">Low</span>}
                    </td>
                    <td className="px-4 py-3">
                      <form action={adjustStock} className="flex items-center gap-2">
                        <input type="hidden" name="productId" value={p.id} />
                        <input type="number" name="stock" min="0" defaultValue={p.stock} className={inputCls} aria-label={`Set stock for ${p.name}`} />
                        <input type="text" name="reason" placeholder="Reason" className="w-28 rounded-md border border-slate-200 px-2 py-1 text-sm outline-none focus:border-blue-500" />
                        <button type="submit" className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-700">Save</button>
                      </form>
                    </td>
                    <td className="px-4 py-3">
                      <form action={setLowStockThreshold} className="flex items-center gap-2">
                        <input type="hidden" name="productId" value={p.id} />
                        <input type="number" name="lowStockThreshold" min="0" defaultValue={p.lowStockThreshold} className={inputCls} aria-label={`Low-stock threshold for ${p.name}`} />
                        <button type="submit" className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100">Save</button>
                      </form>
                    </td>
                  </tr>
                  {p.variants.map((v) => (
                    <tr key={v.id} className="bg-slate-50/40">
                      <td className="px-4 py-2 pl-16 text-slate-600">
                        <span className="text-slate-400">↳</span> {v.name}
                        {v.sku && <span className="ml-2 text-xs text-slate-400">{v.sku}</span>}
                      </td>
                      <td className="px-4 py-2">
                        <span className={v.stock <= 0 ? "font-semibold text-rose-600" : "text-slate-700"}>{v.stock}</span>
                      </td>
                      <td className="px-4 py-2">
                        <form action={adjustStock} className="flex items-center gap-2">
                          <input type="hidden" name="productId" value={p.id} />
                          <input type="hidden" name="variantId" value={v.id} />
                          <input type="number" name="stock" min="0" defaultValue={v.stock} className={inputCls} aria-label={`Set stock for ${v.name}`} />
                          <input type="text" name="reason" placeholder="Reason" className="w-28 rounded-md border border-slate-200 px-2 py-1 text-sm outline-none focus:border-blue-500" />
                          <button type="submit" className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-700">Save</button>
                        </form>
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-400">—</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminPagination
        basePath="/admin/inventory"
        page={result.page}
        totalPages={result.totalPages}
        totalItems={result.total}
        extraParams={{ filter: filterParam, q: q || undefined }}
      />

      {/* Stock-change history */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Recent stock changes</h2>
        {history.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
            No stock changes recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Change</th>
                  <th className="px-4 py-3">New stock</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                      {h.createdAt.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {h.product.name}
                      {h.variant && <span className="text-slate-400"> · {h.variant.name}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={h.delta >= 0 ? "font-semibold text-green-600" : "font-semibold text-rose-600"}>
                        {h.delta >= 0 ? `+${h.delta}` : h.delta}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{h.newStock}</td>
                    <td className="px-4 py-3 text-slate-500">{h.reason ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{h.actor ?? "System"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
