// Customer order detail: /account/orders/[id]
//
// A signed-in customer's view of one of their own orders — line items with
// product image, quantity, unit price and line total, plus a live-updating
// status and the order totals. Customers can only open their own orders.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/src/lib/auth";
import { getOrderById } from "@/src/lib/orders";
import SafeImage from "@/app/components/SafeImage";
import LiveOrderStatus from "@/app/components/LiveOrderStatus";
import { formatQAR } from "@/src/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your Order — FirstStop" };

const FALLBACK_IMAGE = "https://placehold.co/200x200/f1f5f9/94a3b8?text=No+Image";

export default async function CustomerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser(); // redirects to /login if signed out
  const { id } = await params;

  const order = await getOrderById(id);
  // 404 for a missing order or one that isn't this customer's.
  if (!order || order.userId !== user.id) notFound();

  const total = Number(order.total.toString());
  const isBnpl = order.payment?.method === "BNPL";
  const installment = Math.round((total / 4) * 100) / 100;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="mb-6 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/account" className="hover:text-slate-900">
          Your Account
        </Link>
        <span className="mx-1 text-slate-300">/</span>
        <span className="text-slate-700">Order #{order.id.slice(-8).toUpperCase()}</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Order #{order.id.slice(-8).toUpperCase()}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Placed {order.createdAt.toLocaleDateString("en-GB")}
          </p>
        </div>
        <LiveOrderStatus orderId={order.id} initialStatus={order.status} />
      </div>

      {/* Line items with product details */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <ul className="divide-y divide-slate-100">
          {order.items.map((item) => {
            const image = item.product.images[0];
            const unit = Number(item.unitPrice.toString());
            return (
              <li key={item.id} className="flex items-center gap-4 p-4">
                <Link
                  href={`/product/${item.product.slug}`}
                  className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                >
                  <SafeImage
                    src={image?.url ?? FALLBACK_IMAGE}
                    alt={image?.alt ?? item.product.name}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/product/${item.product.slug}`}
                    className="line-clamp-2 text-sm font-medium text-slate-900 hover:text-blue-600"
                  >
                    {item.product.name}
                  </Link>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {formatQAR(unit)} × {item.quantity}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-slate-900">
                  {formatQAR(unit * item.quantity)}
                </span>
              </li>
            );
          })}
        </ul>

        {/* Totals */}
        <dl className="space-y-2 border-t border-slate-200 p-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Delivery</dt>
            <dd className="font-medium text-green-600">Free · across Qatar</dd>
          </div>
          <div className="flex justify-between text-base">
            <dt className="font-semibold text-slate-900">Total</dt>
            <dd className="font-bold text-slate-900">{formatQAR(order.total)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Payment</dt>
            <dd className="font-medium text-slate-700">{isBnpl ? "Pay in 4 (BNPL)" : "Card"}</dd>
          </div>
        </dl>
      </div>

      {isBnpl && (
        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          4 interest-free payments of{" "}
          <span className="font-semibold text-slate-900">{formatQAR(installment)}</span>.
        </p>
      )}

      {order.shippingAddress && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
          <h2 className="mb-1 font-semibold text-slate-900">Delivery address</h2>
          <p className="text-slate-600">{order.shippingAddress}</p>
        </div>
      )}

      <Link
        href="/products"
        className="mt-6 inline-block text-sm font-medium text-blue-600 hover:underline"
      >
        Continue shopping →
      </Link>
    </div>
  );
}
