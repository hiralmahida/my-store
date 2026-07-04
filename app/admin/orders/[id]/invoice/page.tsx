// Printable invoice / packing slip: /admin/orders/[id]/invoice
// The admin chrome is hidden when printing (see AdminShell print: variants).

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminOrder } from "@/src/lib/admin";
import { formatQAR } from "@/src/lib/format";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Invoice — FirstStop" };

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getAdminOrder(id);
  if (!order) notFound();

  const shortId = order.id.slice(-8).toUpperCase();
  const total = Number(order.total.toString());

  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-10">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href={`/admin/orders/${order.id}`} className="text-sm font-medium text-blue-600 hover:underline">
          ← Back to order
        </Link>
        <PrintButton />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 print:border-0 print:p-0">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">F</span>
              <span className="text-lg font-semibold text-slate-900">First<span className="text-blue-600">Stop</span></span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Building 24, Salwa Road, Al Sadd
              <br />
              Doha, Qatar · support@firststop.qa
            </p>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">INVOICE</h1>
            <p className="mt-1 text-sm text-slate-600">#{shortId}</p>
            <p className="text-xs text-slate-500">{order.createdAt.toLocaleDateString("en-GB")}</p>
          </div>
        </div>

        {/* Bill to */}
        <div className="grid grid-cols-2 gap-6 py-6 text-sm">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Bill to</p>
            <p className="font-medium text-slate-900">{order.customerName}</p>
            <p className="text-slate-600">{order.customerEmail}</p>
            {order.customerPhone && <p className="text-slate-600">{order.customerPhone}</p>}
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Deliver to</p>
            <p className="text-slate-600">{order.shippingAddress ?? "—"}</p>
          </div>
        </div>

        {/* Items */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="py-2">Item</th>
              <th className="py-2 text-center">Qty</th>
              <th className="py-2 text-right">Unit</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {order.items.map((item) => {
              const unit = Number(item.unitPrice.toString());
              return (
                <tr key={item.id}>
                  <td className="py-2.5 text-slate-800">{item.product.name}</td>
                  <td className="py-2.5 text-center text-slate-600">{item.quantity}</td>
                  <td className="py-2.5 text-right text-slate-600">{formatQAR(unit)}</td>
                  <td className="py-2.5 text-right font-medium text-slate-900">{formatQAR(unit * item.quantity)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-4 flex justify-end">
          <dl className="w-56 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Delivery</dt>
              <dd className="font-medium text-green-600">Free</dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base">
              <dt className="font-semibold text-slate-900">Total</dt>
              <dd className="font-bold text-slate-900">{formatQAR(total)}</dd>
            </div>
          </dl>
        </div>

        {/* Footer */}
        <div className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500">
          <p>
            Payment: {order.payment ? `${order.payment.method} · ${order.payment.status}` : "—"} · Status: {order.status}
          </p>
          <p className="mt-1">Thank you for shopping with FirstStop. Prices in QAR. This is a computer-generated invoice.</p>
        </div>
      </div>
    </div>
  );
}
