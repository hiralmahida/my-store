// Global admin search: /admin/search?q= — matches orders, products, customers.

import type { Metadata } from "next";
import Link from "next/link";
import { adminSearch } from "@/src/lib/admin";
import { formatQAR } from "@/src/lib/format";
import StatusBadge from "../_components/StatusBadge";
import EmptyState from "../_components/EmptyState";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Search — FirstStop Admin" };

export default async function AdminSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = ((await searchParams).q ?? "").trim();
  const { orders, products, customers } = await adminSearch(q);
  const total = orders.length + products.length + customers.length;

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Search {q && <span className="text-slate-400">for “{q}”</span>}
      </h1>

      {!q ? (
        <p className="mt-4 text-sm text-slate-500">
          Type an order number, customer name/email, or product name in the search box above.
        </p>
      ) : total === 0 ? (
        <div className="mt-6">
          <EmptyState title={`No matches for “${q}”`} description="Try a different order number, name, email or product." />
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {/* Orders */}
          {orders.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-slate-900">Orders</h2>
              <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
                {orders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50">
                      <span className="font-medium text-slate-900">#{o.id.slice(-8).toUpperCase()}</span>
                      <span className="text-slate-500">{o.customerName}</span>
                      <span className="font-medium text-slate-900">{formatQAR(o.total)}</span>
                      <StatusBadge status={o.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Products */}
          {products.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-slate-900">Products</h2>
              <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
                {products.map((p) => (
                  <li key={p.id}>
                    <Link href={`/admin/products/${p.id}`} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50">
                      <span className="font-medium text-slate-900">{p.name}</span>
                      <span className="text-slate-500">{formatQAR(p.price)}</span>
                      <span className="text-slate-500">{p.stock} in stock</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Customers */}
          {customers.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-slate-900">Customers</h2>
              <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
                {customers.map((c) => (
                  <li key={c.id}>
                    <Link href={`/admin/customers`} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50">
                      <span className="font-medium text-slate-900">{c.name}</span>
                      <span className="text-slate-500">{c.email}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
