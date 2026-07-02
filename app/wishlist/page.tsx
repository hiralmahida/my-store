// Wishlist page: /wishlist
//
// Server Component. Lists the guest's saved products. Each card links to the
// product and offers "Add to Cart" and a heart toggle (which removes it here).

import type { Metadata } from "next";
import Link from "next/link";
import ProductCard from "@/app/components/ProductCard";
import AddToCartButton from "@/app/components/AddToCartButton";
import WishlistButton from "@/app/components/WishlistButton";
import { getWishlist } from "@/src/lib/cart";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your Wishlist — FirstStop",
  description: "Products you've saved at FirstStop.",
};

export default async function WishlistPage() {
  const wishlist = await getWishlist();

  if (wishlist.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Your wishlist is empty
        </h1>
        <p className="mt-2 text-slate-500">
          Tap the heart on any product to save it for later.
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
        Your Wishlist{" "}
        <span className="text-base font-normal text-slate-400">
          ({wishlist.length} item{wishlist.length === 1 ? "" : "s"})
        </span>
      </h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {wishlist.map((entry) => (
          <div key={entry.id} className="flex flex-col">
            <ProductCard product={entry.product} />
            <div className="mt-2 flex flex-col gap-2">
              <AddToCartButton
                productId={entry.productId}
                disabled={entry.product.stock <= 0}
                size="compact"
              />
              <WishlistButton
                productId={entry.productId}
                initialWishlisted
                size="compact"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
