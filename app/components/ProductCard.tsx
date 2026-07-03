// A single product card used across grids.
// Server Component: it just renders data, so no "use client" is needed.

import Link from "next/link";
import type { FeaturedProduct } from "@/src/lib/products";
import { formatQAR } from "@/src/lib/format";
import QuickAddButton from "./QuickAddButton";
import SafeImage from "./SafeImage";
import RatingStars from "./RatingStars";

export default function ProductCard({ product }: { product: FeaturedProduct }) {
  const image = product.images[0];
  const imageUrl =
    image?.url ?? "https://placehold.co/600x600/f1f5f9/94a3b8?text=No+Image";
  const imageAlt = image?.alt ?? product.name;

  const price = Number(product.price.toString());
  const compareAt =
    product.compareAtPrice != null ? Number(product.compareAtPrice.toString()) : null;
  const discountPct =
    compareAt && compareAt > price ? Math.round((1 - price / compareAt) * 100) : null;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg">
      <Link href={`/product/${product.slug}`} prefetch className="flex flex-1 flex-col">
        <div className="relative aspect-square overflow-hidden bg-slate-50">
          <SafeImage
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
          {discountPct !== null && (
            <span className="absolute right-2 top-2 rounded-full bg-rose-600 px-2 py-1 text-xs font-bold text-white">
              -{discountPct}%
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
            {product.brand.name}
          </p>
          <h3 className="mt-1 line-clamp-2 text-sm font-medium text-slate-900">
            {product.name}
          </h3>
          {product.rating != null && (
            <div className="mt-1.5">
              <RatingStars rating={product.rating} count={product.reviewCount} />
            </div>
          )}
          <div className="mt-auto pt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-base font-semibold text-slate-900">
                {formatQAR(product.price)}
              </span>
              {compareAt && compareAt > price && (
                <span className="text-xs text-slate-400 line-through">
                  {formatQAR(compareAt)}
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] font-medium text-green-600">Free delivery</p>
          </div>
        </div>
      </Link>

      {/* Quick add-to-cart (does not trigger the card link). */}
      <QuickAddButton productId={product.id} disabled={product.stock <= 0} />
    </div>
  );
}
