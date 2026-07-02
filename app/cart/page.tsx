// Shopping cart page: /cart
//
// Server Component. Line-item quantity and remove controls are plain forms
// whose `action` is a server action bound to the relevant product — so the cart
// works without client JavaScript. Totals (free delivery + BNPL split) come
// from getCart().

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getCart } from "@/src/lib/cart";
import { setCartItemQuantity, removeFromCart } from "@/app/cart/actions";
import { formatQAR } from "@/src/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your Cart — FirstStop",
  description: "Review the items in your FirstStop cart.",
};

const FALLBACK_IMAGE = "https://placehold.co/200x200/f1f5f9/94a3b8?text=No+Image";

export default async function CartPage() {
  const cart = await getCart();

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Your cart is empty
        </h1>
        <p className="mt-2 text-slate-500">
          Browse the catalog and add something you like.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Shop all products
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-2xl font-bold tracking-tight text-slate-900">
        Your Cart{" "}
        <span className="text-base font-normal text-slate-400">
          ({cart.itemCount} item{cart.itemCount === 1 ? "" : "s"})
        </span>
      </h1>

      <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
        {/* Line items */}
        <ul className="divide-y divide-slate-100">
          {cart.items.map((item) => {
            const image = item.product.images[0];
            const unit = Number(item.product.price.toString());
            const lineTotal = unit * item.quantity;
            const atMax = item.quantity >= item.product.stock;

            return (
              <li key={item.id} className="flex gap-4 py-5">
                {/* Image */}
                <Link
                  href={`/product/${item.product.slug}`}
                  className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                >
                  <Image
                    src={image?.url ?? FALLBACK_IMAGE}
                    alt={image?.alt ?? item.product.name}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </Link>

                {/* Details */}
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                    {item.product.brand.name}
                  </p>
                  <Link
                    href={`/product/${item.product.slug}`}
                    className="mt-0.5 line-clamp-2 text-sm font-medium text-slate-900 hover:text-blue-600"
                  >
                    {item.product.name}
                  </Link>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {formatQAR(item.product.price)} each
                  </p>

                  {/* Quantity stepper + remove (bound server actions) */}
                  <div className="mt-auto flex items-center gap-3 pt-3">
                    <div className="flex items-center rounded-md border border-slate-200">
                      <form action={setCartItemQuantity.bind(null, item.productId, item.quantity - 1)}>
                        <button
                          type="submit"
                          aria-label="Decrease quantity"
                          className="flex h-8 w-8 items-center justify-center text-slate-600 transition hover:bg-slate-100"
                        >
                          −
                        </button>
                      </form>
                      <span className="w-8 text-center text-sm font-medium text-slate-900">
                        {item.quantity}
                      </span>
                      <form action={setCartItemQuantity.bind(null, item.productId, item.quantity + 1)}>
                        <button
                          type="submit"
                          aria-label="Increase quantity"
                          disabled={atMax}
                          className="flex h-8 w-8 items-center justify-center text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
                        >
                          +
                        </button>
                      </form>
                    </div>

                    <form action={removeFromCart.bind(null, item.productId)}>
                      <button
                        type="submit"
                        className="text-sm font-medium text-slate-500 transition hover:text-rose-600"
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                  {atMax && (
                    <p className="pt-1 text-xs text-amber-600">
                      Max stock reached ({item.product.stock} available)
                    </p>
                  )}
                </div>

                {/* Line total */}
                <div className="shrink-0 text-right text-sm font-semibold text-slate-900">
                  {formatQAR(lineTotal)}
                </div>
              </li>
            );
          })}
        </ul>

        {/* Order summary */}
        <aside className="h-fit rounded-2xl border border-slate-200 p-6 lg:sticky lg:top-32">
          <h2 className="text-lg font-semibold text-slate-900">Order summary</h2>

          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Subtotal</dt>
              <dd className="font-medium text-slate-900">{formatQAR(cart.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Delivery</dt>
              <dd className="font-medium text-green-600">Free</dd>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-3 text-base">
              <dt className="font-semibold text-slate-900">Total</dt>
              <dd className="font-bold text-slate-900">{formatQAR(cart.total)}</dd>
            </div>
          </dl>

          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            or 4 interest-free payments of{" "}
            <span className="font-semibold text-slate-700">
              {formatQAR(cart.installment)}
            </span>{" "}
            with BNPL
          </p>

          <Link
            href="/checkout"
            className="mt-5 block w-full rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Proceed to Checkout
          </Link>

          <Link
            href="/products"
            className="mt-4 block text-center text-sm font-medium text-blue-600 hover:underline"
          >
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
