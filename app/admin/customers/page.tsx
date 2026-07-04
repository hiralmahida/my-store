// Admin customer list: /admin/customers
// Search, segment tabs, order counts and lifetime spend. Each row links to the
// customer profile. Disabling lives on the profile page.

import type { Metadata } from "next";
import Link from "next/link";
import { listCustomers, CUSTOMER_SEGMENTS } from "@/src/lib/admin";
import { requireSection } from "@/src/lib/require-section";
import { formatQAR } from "@/src/lib/format";
import { DataTable, Thead, Th, Tbody } from "@/app/admin/_components/DataTable";
import EmptyState from "@/app/admin/_components/EmptyState";
import StatusBadge from "@/app/admin/_components/StatusBadge";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Customers — FirstStop Admin" };

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; segment?: string }>;
}) {
  await requireSection("customers");

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const segment = sp.segment ?? "all";
  const customers = await listCustomers({ q, segment });

  const qsFor = (seg: string) => {
    const p = new URLSearchParams();
    if (seg !== "all") p.set("segment", seg);
    if (q) p.set("q", q);
    const s = p.toString();
    return `/admin/customers${s ? `?${s}` : ""}`;
  };

  return (
    <div className="p-6 sm:p-8">
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-slate-900">Customers</h1>
      <p className="mb-5 text-sm text-slate-500">
        {customers.length} {customers.length === 1 ? "customer" : "customers"}
        {segment !== "all" || q ? " matching your filters" : " registered"}
      </p>

      {/* Segment tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {CUSTOMER_SEGMENTS.map((s) => {
          const active = s.key === segment;
          return (
            <Link
              key={s.key}
              href={qsFor(s.key)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {s.label}
            </Link>
          );
        })}
      </div>

      {/* Search */}
      <form className="mb-4 max-w-sm" action="/admin/customers">
        {segment !== "all" && <input type="hidden" name="segment" value={segment} />}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name or email…"
          aria-label="Search customers"
          className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </form>

      {customers.length === 0 ? (
        <EmptyState
          title="No customers found"
          description="Try a different search term or segment."
        />
      ) : (
        <DataTable>
          <Thead>
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th className="text-right">Orders</Th>
              <Th className="text-right">Lifetime spend</Th>
              <Th>Joined</Th>
              <Th>Status</Th>
            </tr>
          </Thead>
          <Tbody>
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">
                  <Link
                    href={`/admin/customers/${c.id}`}
                    className="hover:text-blue-600 hover:underline"
                  >
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{c.email}</td>
                <td className="px-4 py-3 text-right text-slate-600">{c.orderCount}</td>
                <td className="px-4 py-3 text-right text-slate-900">{formatQAR(c.spend)}</td>
                <td className="px-4 py-3 text-slate-500">
                  {c.createdAt.toLocaleDateString("en-GB")}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.disabled ? "DISABLED" : "ACTIVE"} />
                </td>
              </tr>
            ))}
          </Tbody>
        </DataTable>
      )}
    </div>
  );
}
