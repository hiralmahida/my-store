// Admin transactions: /admin/transactions
// Payments across all orders — status tabs, method filter, search, pagination,
// and a success-volume KPI. Each row links to its order.

import type { Metadata } from "next";
import Link from "next/link";
import { listTransactions, PAYMENT_METHODS } from "@/src/lib/admin";
import { formatQAR } from "@/src/lib/format";
import { DataTable, Thead, Th, Tbody } from "../_components/DataTable";
import StatusBadge from "../_components/StatusBadge";
import StatCard from "../_components/StatCard";
import EmptyState from "../_components/EmptyState";
import AdminPagination from "../_components/AdminPagination";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Transactions — FirstStop Admin" };

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "SUCCEEDED", label: "Succeeded" },
  { key: "PENDING", label: "Pending" },
  { key: "FAILED", label: "Failed" },
];

const METHOD_LABEL: Record<string, string> = { CARD: "Card", BNPL: "Installments" };

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; method?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status && sp.status !== "all" ? sp.status : undefined;
  const method = sp.method && sp.method !== "all" ? sp.method : undefined;
  const q = (sp.q ?? "").trim();

  const result = await listTransactions({
    status,
    method,
    q,
    page: sp.page ? Number(sp.page) : 1,
  });

  const clean = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(o)) if (v) p.set(k, v);
    return p.toString();
  };
  const extra = { status, method, q: q || undefined };

  return (
    <div className="p-6 sm:p-8">
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-slate-900">Transactions</h1>
      <p className="mb-5 text-sm text-slate-500">Payments captured across all orders.</p>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Successful volume" value={formatQAR(result.volume)} accent="text-green-600" hint="matching filter" />
        <StatCard label="Succeeded" value={String(result.counts.succeeded)} hint="all time" />
        <StatCard label="Failed" value={String(result.counts.failed)} accent="text-rose-600" hint="all time" />
      </div>

      {/* Status tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => {
          const active = (status ?? "all") === t.key;
          const href = `/admin/transactions?${clean({
            status: t.key !== "all" ? t.key : undefined,
            method,
            q: q || undefined,
          })}`;
          return (
            <Link
              key={t.key}
              href={href}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                active ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {/* Search + method filter */}
      <form action="/admin/transactions" className="mb-5 flex max-w-xl flex-wrap items-center gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search reference, order # or customer…"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <select
          name="method"
          defaultValue={method ?? "all"}
          aria-label="Payment method"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          <option value="all">All methods</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {METHOD_LABEL[m] ?? m}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Search
        </button>
      </form>

      {result.rows.length === 0 ? (
        <EmptyState
          title={q ? `No transactions match “${q}”` : "No transactions yet"}
          description="Payments appear here as customers check out."
        />
      ) : (
        <>
          <DataTable>
            <Thead>
              <tr>
                <Th>Reference</Th>
                <Th>Order</Th>
                <Th>Customer</Th>
                <Th>Method</Th>
                <Th className="text-right">Amount</Th>
                <Th>Status</Th>
                <Th>Date</Th>
              </tr>
            </Thead>
            <Tbody>
              {result.rows.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{t.reference}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${t.orderId}`} className="font-medium text-blue-600 hover:underline">
                      #{t.orderId.slice(-8).toUpperCase()}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{t.customerName}</td>
                  <td className="px-4 py-3 text-slate-600">{METHOD_LABEL[t.method] ?? t.method}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">{formatQAR(t.amount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-3 text-slate-500">{t.createdAt.toLocaleDateString("en-GB")}</td>
                </tr>
              ))}
            </Tbody>
          </DataTable>
          <AdminPagination
            basePath="/admin/transactions"
            page={result.page}
            totalPages={result.totalPages}
            totalItems={result.total}
            extraParams={extra}
          />
        </>
      )}
    </div>
  );
}
