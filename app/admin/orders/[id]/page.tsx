// Admin order detail + status update: /admin/orders/[id]
//
// Changing the status calls updateOrderStatus, which pushes the new status live
// to the customer (their LiveOrderStatus pill updates without a refresh).

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminOrder } from "@/src/lib/admin";
import { updateOrderStatus } from "@/app/admin/actions";
import { formatQAR } from "@/src/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order — FirstStop Admin" };

const STATUSES = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getAdminOrder(id);
  if (!order) notFound();

  return (
    <div className="p-8">
      <nav className="mb-2 text-sm text-slate-500">
        <Link href="/admin/orders" className="hover:text-slate-900">Orders</Link>
        <span className="mx-1 text-slate-300">/</span>
        <span className="text-slate-700">#{order.id.slice(-8).toUpperCase()}</span>
      </nav>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">
        Order #{order.id.slice(-8).toUpperCase()}
      </h1>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Items */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3 text-right">Line total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-slate-800">{item.product.name}</td>
                    <td className="px-4 py-3 text-slate-600">{item.quantity}</td>
                    <td className="px-4 py-3 text-slate-600">{formatQAR(item.unitPrice)}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {formatQAR(Number(item.unitPrice.toString()) * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200">
                  <td colSpan={3} className="px-4 py-3 text-right font-semibold text-slate-900">Total</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">{formatQAR(order.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Sidebar: status, customer, payment */}
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Status</h2>
            <form action={updateOrderStatus.bind(null, order.id)} className="flex gap-2">
              <select
                name="status"
                defaultValue={order.status}
                className="flex-1 rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Update
              </button>
            </form>
            <p className="mt-2 text-xs text-slate-400">
              The customer sees the new status update live.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Customer</h2>
            <dl className="space-y-1.5 text-slate-600">
              <div><dt className="inline text-slate-400">Name: </dt><dd className="inline">{order.customerName}</dd></div>
              <div><dt className="inline text-slate-400">Email: </dt><dd className="inline">{order.customerEmail}</dd></div>
              {order.customerPhone && <div><dt className="inline text-slate-400">Phone: </dt><dd className="inline">{order.customerPhone}</dd></div>}
              {order.shippingAddress && <div><dt className="inline text-slate-400">Address: </dt><dd className="inline">{order.shippingAddress}</dd></div>}
              <div><dt className="inline text-slate-400">Account: </dt><dd className="inline">{order.user ? order.user.email : "Guest checkout"}</dd></div>
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Payment</h2>
            {order.payment ? (
              <dl className="space-y-1.5 text-slate-600">
                <div><dt className="inline text-slate-400">Method: </dt><dd className="inline">{order.payment.method}</dd></div>
                <div><dt className="inline text-slate-400">Provider: </dt><dd className="inline">{order.payment.provider}</dd></div>
                <div><dt className="inline text-slate-400">Reference: </dt><dd className="inline font-mono text-xs">{order.payment.reference}</dd></div>
                <div><dt className="inline text-slate-400">Status: </dt><dd className="inline">{order.payment.status}</dd></div>
              </dl>
            ) : (
              <p className="text-slate-400">No payment record.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
