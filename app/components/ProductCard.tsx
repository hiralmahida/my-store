// A single product card used in the homepage grid.
// Server Component: it just renders data, so no "use client" is needed.

import Image from "next/image";
import Link from "next/link";
import type { FeaturedProduct } from "@/src/lib/products";
import { formatQAR } from "@/src/lib/format";
import QuickAddButton from "./QuickAddButton";

export default function ProductCard({ product }: { product: FeaturedProduct }) {
  // Use the first image if the product has one; otherwise fall back to a
  // neutral placeholder so the layout never breaks.
  const image = product.images[0];
  const imageUrl =
    image?.url ?? "https://placehold.co/600x600/f1f5f9/94a3b8?text=No+Image";
  const imageAlt = image?.alt ?? product.name;

  // The card is a link; the quick-add button is a sibling positioned over it,
  // so clicking the button adds to cart while clicking anywhere else opens the
  // product page.
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg">
      <Link href={`/product/${product.slug}`} prefetch className="flex flex-1 flex-col">
        {/* Image area with a fixed square aspect ratio for a tidy grid. */}
        <div className="relative aspect-square overflow-hidden bg-slate-50">
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
          {product.stock === 0 && (
            <span className="absolute left-2 top-2 rounded-full bg-slate-900/80 px-2 py-1 text-xs font-medium text-white">
              Out of stock
            </span>
          )}
        </div>

        {/* Text area */}
        <div className="flex flex-1 flex-col p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
            {product.brand.name}
          </p>
          <h3 className="mt-1 line-clamp-2 text-sm font-medium text-slate-900">
            {product.name}
          </h3>
          <p className="mt-auto pt-3 text-base font-semibold text-slate-900">
            {formatQAR(product.price)}
          </p>
        </div>
      </Link>

      {/* Quick add-to-cart (does not trigger the card link). */}
      <QuickAddButton productId={product.id} disabled={product.stock <= 0} />
    </div>
  );
}
