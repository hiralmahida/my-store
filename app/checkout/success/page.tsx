// Order confirmation page: /checkout/success?order=<id>

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrderById } from "@/src/lib/orders";
import { formatQAR } from "@/src/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order confirmed — FirstStop",
  description: "Your FirstStop order is confirmed.",
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: id } = await searchParams;
  if (!id) redirect("/");

  const order = await getOrderById(id);
  if (!order) notFound();

  const total = Number(order.total.toString());
  const isBnpl = order.payment?.method === "BNPL";
  const installment = Math.round((total / 4) * 100) / 100;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <CheckIcon className="h-7 w-7 text-green-600" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
          Thank you — your order is confirmed!
        </h1>
        <p className="mt-2 text-slate-500">
          Order{" "}
          <span className="font-semibold text-slate-700">
            #{order.id.slice(-8).toUpperCase()}
          </span>{" "}
          · a confirmation was sent to {order.customerEmail}.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 p-6">
        {/* Items */}
        <ul className="divide-y divide-slate-100">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-3 text-sm">
              <span className="text-slate-700">
                {item.product.name}{" "}
                <span className="text-slate-400">× {item.quantity}</span>
              </span>
              <span className="font-medium text-slate-900">
                {formatQAR(Number(item.unitPrice.toString()) * item.quantity)}
              </span>
            </li>
          ))}
        </ul>

        {/* Totals + payment */}
        <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Delivery</dt>
            <dd className="font-medium text-green-600">Free · across Qatar</dd>
          </div>
          <div className="flex justify-between text-base">
            <dt className="font-semibold text-slate-900">Total paid</dt>
            <dd className="font-bold text-slate-900">{formatQAR(order.total)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Payment</dt>
            <dd className="font-medium text-slate-700">
              {isBnpl ? "Pay in 4 (BNPL)" : "Card"}
            </dd>
          </div>
        </dl>

        {isBnpl && (
          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            4 interest-free payments of{" "}
            <span className="font-semibold text-slate-900">{formatQAR(installment)}</span> —
            the first today, the rest every 2 weeks.
          </p>
        )}
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/account"
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          View your orders
        </Link>
        <Link
          href="/products"
          className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
