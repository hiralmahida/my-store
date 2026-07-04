// Admin order detail: /admin/orders/[id]
//
// Activity timeline, customer + delivery, line items with images, totals,
// refund, internal notes and tags. Status changes update the DB and push live
// to the customer (LiveOrderStatus).

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminOrder } from "@/src/lib/admin";
import {
  updateOrderStatus,
  refundOrder,
  addOrderNote,
  addOrderTag,
  removeOrderTag,
} from "@/app/admin/actions";
import Breadcrumbs from "@/app/admin/_components/Breadcrumbs";
import StatusBadge from "@/app/admin/_components/StatusBadge";
import SafeImage from "@/app/components/SafeImage";
import { formatQAR } from "@/src/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order — FirstStop Admin" };

const STATUSES = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];
const FALLBACK_IMAGE = "https://placehold.co/200x200/f1f5f9/94a3b8?text=No+Image";

const DOT: Record<string, string> = {
  PLACED: "bg-blue-500",
  PAID: "bg-green-500",
  STATUS_CHANGE: "bg-indigo-500",
  NOTE: "bg-slate-400",
  REFUND: "bg-rose-500",
};

function fmtDateTime(d: Date): string {
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getAdminOrder(id);
  if (!order) notFound();

  const shortId = order.id.slice(-8).toUpperCase();

  // Build the timeline: synthesized placed/paid + stored events, oldest first.
  const timeline: { label: string; at: Date; kind: string; actor?: string }[] = [
    { label: "Order placed", at: order.createdAt, kind: "PLACED" },
  ];
  if (order.payment?.status === "SUCCEEDED") {
    timeline.push({
      label: `Payment received · ${order.payment.method}`,
      at: order.createdAt,
      kind: "PAID",
    });
  }
  for (const e of order.events) {
    timeline.push({ label: e.message, at: e.createdAt, kind: e.type, actor: e.actor ?? undefined });
  }
  timeline.sort((a, b) => a.at.getTime() - b.at.getTime());

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumbs items={[{ label: "Orders", href: "/admin/orders" }, { label: `#${shortId}` }]} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Order #{shortId}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="mt-0.5 text-sm text-slate-500">Placed {fmtDateTime(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/admin/orders/${order.id}/invoice`}
            target="_blank"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Print invoice
          </a>
          {order.status !== "REFUNDED" && (
            <form action={refundOrder.bind(null, order.id)}>
              <button
                type="submit"
                className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
              >
                Refund
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Line items */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <ul className="divide-y divide-slate-100">
              {order.items.map((item) => {
                const image = item.product.images[0];
                const unit = Number(item.unitPrice.toString());
                return (
                  <li key={item.id} className="flex items-center gap-4 p-4">
                    <Link
                      href={`/product/${item.product.slug}`}
                      target="_blank"
                      className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                    >
                      <SafeImage src={image?.url ?? FALLBACK_IMAGE} alt={image?.alt ?? item.product.name} fill sizes="56px" className="object-cover" />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium text-slate-900">{item.product.name}</p>
                      <p className="mt-0.5 text-sm text-slate-500">{formatQAR(unit)} × {item.quantity}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-slate-900">{formatQAR(unit * item.quantity)}</span>
                  </li>
                );
              })}
            </ul>
            <dl className="space-y-1.5 border-t border-slate-200 p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Delivery</dt>
                <dd className="font-medium text-green-600">Free</dd>
              </div>
              <div className="flex justify-between text-base">
                <dt className="font-semibold text-slate-900">Total</dt>
                <dd className="font-bold text-slate-900">{formatQAR(order.total)}</dd>
              </div>
            </dl>
          </section>

          {/* Timeline */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Activity timeline</h2>
            <ol className="space-y-4">
              {timeline.map((t, i) => (
                <li key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`mt-1 h-2.5 w-2.5 rounded-full ${DOT[t.kind] ?? "bg-slate-400"}`} />
                    {i < timeline.length - 1 && <span className="mt-1 w-px flex-1 bg-slate-200" />}
                  </div>
                  <div className="-mt-0.5 pb-1">
                    <p className="text-sm text-slate-800">{t.label}</p>
                    <p className="text-xs text-slate-400">
                      {fmtDateTime(t.at)}
                      {t.actor ? ` · ${t.actor}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            {/* Add internal note */}
            <form action={addOrderNote.bind(null, order.id)} className="mt-5 flex items-start gap-2 border-t border-slate-100 pt-4">
              <input
                name="note"
                placeholder="Add an internal note…"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
                Add note
              </button>
            </form>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Status</h2>
            <form action={updateOrderStatus.bind(null, order.id)} className="flex gap-2">
              <select
                key={order.status}
                name="status"
                defaultValue={order.status}
                className="flex-1 rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                ))}
              </select>
              <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
                Update
              </button>
            </form>
            <p className="mt-2 text-xs text-slate-400">The customer sees the new status update live.</p>
          </section>

          {/* Tags */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Tags</h2>
            <div className="flex flex-wrap gap-1.5">
              {order.tags.length === 0 && <span className="text-sm text-slate-400">No tags</span>}
              {order.tags.map((tag) => (
                <form key={tag} action={removeOrderTag.bind(null, order.id, tag)}>
                  <button
                    type="submit"
                    title="Remove tag"
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-rose-100 hover:text-rose-600"
                  >
                    {tag} <span aria-hidden="true">×</span>
                  </button>
                </form>
              ))}
            </div>
            <form action={addOrderTag.bind(null, order.id)} className="mt-3 flex gap-2">
              <input name="tag" placeholder="Add tag" className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-blue-500" />
              <button type="submit" className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Add</button>
            </form>
          </section>

          {/* Customer */}
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

          {/* Payment */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Payment</h2>
            {order.payment ? (
              <dl className="space-y-1.5 text-slate-600">
                <div><dt className="inline text-slate-400">Method: </dt><dd className="inline">{order.payment.method}</dd></div>
                <div><dt className="inline text-slate-400">Reference: </dt><dd className="inline font-mono text-xs">{order.payment.reference}</dd></div>
                <div className="flex items-center gap-1"><dt className="text-slate-400">Status: </dt><dd><StatusBadge status={order.payment.status} /></dd></div>
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
