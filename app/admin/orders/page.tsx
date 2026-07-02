// Admin orders list with a status filter: /admin/orders?status=PAID

import type { Metadata } from "next";
import Link from "next/link";
import { listAdminOrders } from "@/src/lib/admin";
import { formatQAR } from "@/src/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Orders — FirstStop Admin" };

const STATUSES = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  PAID: "bg-blue-100 text-blue-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-rose-100 text-rose-700",
  REFUNDED: "bg-slate-200 text-slate-700",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const orders = await listAdminOrders(status);

  const tab = (label: string, value?: string) => {
    const active = (value ?? "") === (status ?? "");
    return (
      <Link
        key={label}
        href={value ? `/admin/orders?status=${value}` : "/admin/orders"}
        className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
          active ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">Orders</h1>

      <div className="mb-5 flex flex-wrap gap-2">
        {tab("All")}
        {STATUSES.map((s) => tab(s.charAt(0) + s.slice(1).toLowerCase(), s))}
      </div>

      {orders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-400">
          No orders{status ? ` with status ${status}` : ""} yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o) => (
                <tr key={o.id} className="cursor-pointer hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${o.id}`} className="font-medium text-blue-600 hover:underline">
                      #{o.id.slice(-8).toUpperCase()}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{o.customerName}</td>
                  <td className="px-4 py-3 text-slate-600">{o._count.items}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{formatQAR(o.total)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[o.status] ?? "bg-slate-100 text-slate-700"}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {o.createdAt.toLocaleDateString("en-GB")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
