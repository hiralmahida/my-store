// Admin invoices: /admin/invoices
// One invoice per order, searchable and paginated. Each links to the printable
// single-invoice view at /admin/orders/[id]/invoice.

import type { Metadata } from "next";
import Link from "next/link";
import { listInvoices } from "@/src/lib/admin";
import { formatQAR } from "@/src/lib/format";
import { DataTable, Thead, Th, Tbody } from "../_components/DataTable";
import StatusBadge from "../_components/StatusBadge";
import StatCard from "../_components/StatCard";
import EmptyState from "../_components/EmptyState";
import AdminPagination from "../_components/AdminPagination";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Invoices — FirstStop Admin" };

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  const result = await listInvoices({ q, page: sp.page ? Number(sp.page) : 1 });

  return (
    <div className="p-6 sm:p-8">
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-slate-900">Invoices</h1>
      <p className="mb-5 text-sm text-slate-500">A billing document for every order.</p>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Invoices" value={String(result.total)} hint="matching filter" />
        <StatCard label="Total billed" value={formatQAR(result.billed)} accent="text-green-600" />
      </div>

      {/* Search */}
      <form action="/admin/invoices" className="mb-5 flex max-w-md items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search invoice #, customer name or email…"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Search
        </button>
      </form>

      {result.rows.length === 0 ? (
        <EmptyState
          title={q ? `No invoices match “${q}”` : "No invoices yet"}
          description="Invoices are generated for every order placed."
        />
      ) : (
        <>
          <DataTable>
            <Thead>
              <tr>
                <Th>Invoice</Th>
                <Th>Customer</Th>
                <Th className="text-right">Amount</Th>
                <Th>Order status</Th>
                <Th>Payment</Th>
                <Th>Date</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </Thead>
            <Tbody>
              {result.rows.map((inv) => (
                <tr key={inv.orderId} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${inv.orderId}/invoice`}
                      className="font-semibold text-blue-600 hover:underline"
                    >
                      {inv.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {inv.customerName}
                    <span className="mt-0.5 block text-xs text-slate-400">{inv.customerEmail}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">{formatQAR(inv.total)}</td>
                  <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                  <td className="px-4 py-3">
                    {inv.paymentStatus ? (
                      <StatusBadge status={inv.paymentStatus} />
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{inv.createdAt.toLocaleDateString("en-GB")}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/admin/orders/${inv.orderId}/invoice`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        View
                      </Link>
                      <Link
                        href={`/admin/orders/${inv.orderId}`}
                        className="font-medium text-slate-600 hover:underline"
                      >
                        Order
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </Tbody>
          </DataTable>
          <AdminPagination
            basePath="/admin/invoices"
            page={result.page}
            totalPages={result.totalPages}
            totalItems={result.total}
            extraParams={{ q: q || undefined }}
          />
        </>
      )}
    </div>
  );
}
