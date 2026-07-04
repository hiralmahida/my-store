// Checkout page: /checkout
//
// Requires a non-empty cart (redirects to /cart otherwise). Prefills the name
// and email for signed-in users. Renders the checkout form alongside a read-
// only order summary.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import SafeImage from "@/app/components/SafeImage";
import CheckoutForm from "@/app/components/CheckoutForm";
import CouponBox from "@/app/checkout/CouponBox";
import { getCart } from "@/src/lib/cart";
import { getCurrentUser } from "@/src/lib/auth";
import { formatQAR } from "@/src/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout — FirstStop",
  description: "Complete your FirstStop order.",
};

const FALLBACK_IMAGE = "https://placehold.co/200x200/f1f5f9/94a3b8?text=No+Image";

export default async function CheckoutPage() {
  const [cart, user] = await Promise.all([getCart(), getCurrentUser()]);

  // Must be signed in to check out (browsing and building a cart stays open to
  // guests; placing an order requires an account).
  if (!user) redirect("/login?next=/checkout&flash=login-required");

  // Can't check out an empty cart.
  if (cart.items.length === 0) redirect("/cart");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-2xl font-bold tracking-tight text-slate-900">Checkout</h1>

      <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
        {/* Form */}
        <CheckoutForm
          defaultName={user?.name ?? ""}
          defaultEmail={user?.email ?? ""}
          total={cart.total}
          installment={cart.installment}
        />

        {/* Order summary */}
        <aside className="h-fit rounded-2xl border border-slate-200 p-6 lg:sticky lg:top-32">
          <h2 className="text-lg font-semibold text-slate-900">Order summary</h2>

          <ul className="mt-4 space-y-4">
            {cart.items.map((item) => {
              const image = item.product.images[0];
              const lineTotal = Number(item.product.price.toString()) * item.quantity;
              return (
                <li key={item.id} className="flex gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    <SafeImage
                      src={image?.url ?? FALLBACK_IMAGE}
                      alt={image?.alt ?? item.product.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-700 px-1 text-[10px] font-semibold text-white">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium text-slate-900">
                      {item.product.name}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-slate-900">
                    {formatQAR(lineTotal)}
                  </span>
                </li>
              );
            })}
          </ul>

          {/* Coupon */}
          <div className="mt-6 border-t border-slate-100 pt-4">
            <CouponBox
              applied={{
                code: cart.discountCode,
                label: cart.discountLabel,
                discount: cart.discount,
                automatic: cart.discountAuto,
                error: cart.discountError,
              }}
            />
          </div>

          <dl className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Subtotal</dt>
              <dd className="font-medium text-slate-900">{formatQAR(cart.subtotal)}</dd>
            </div>
            {cart.discount > 0 && (
              <div className="flex justify-between">
                <dt className="text-slate-500">
                  Discount{cart.discountCode ? ` (${cart.discountCode})` : ""}
                </dt>
                <dd className="font-medium text-green-600">−{formatQAR(cart.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-slate-500">Delivery</dt>
              <dd className="font-medium text-green-600">Free</dd>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-3 text-base">
              <dt className="font-semibold text-slate-900">Total</dt>
              <dd className="font-bold text-slate-900">{formatQAR(cart.total)}</dd>
            </div>
          </dl>

          <Link
            href="/cart"
            className="mt-4 block text-center text-sm font-medium text-blue-600 hover:underline"
          >
            Edit cart
          </Link>
        </aside>
      </div>
    </div>
  );
}
