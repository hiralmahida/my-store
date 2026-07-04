// Product detail page: /product/[slug]
//
// Shows the image gallery, price + BNPL installment split, live-ready stock
// status, a specs table, the description, and related products.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductGallery from "@/app/components/ProductGallery";
import QuantityAddToCart from "@/app/components/QuantityAddToCart";
import WishlistButton from "@/app/components/WishlistButton";
import LiveStock from "@/app/components/LiveStock";
import RatingStars from "@/app/components/RatingStars";
import ProductGrid from "@/app/components/ProductGrid";
import { getProductBySlug, getRelatedProducts } from "@/src/lib/products";
import { isWishlisted } from "@/src/lib/cart";
import { formatQAR } from "@/src/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found — FirstStop" };
  return {
    title: product.seoTitle?.trim() || `${product.name} — FirstStop`,
    description: product.seoDescription?.trim() || product.description.slice(0, 160),
  };
}

// Turn a spec key like "waterResistance" or "ray_tracing" into "Water
// Resistance" / "Ray Tracing" for display.
function prettifyKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatSpecValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [related, wishlisted] = await Promise.all([
    getRelatedProducts(product),
    isWishlisted(product.id),
  ]);

  // Prices: Prisma returns a Decimal; convert once for arithmetic. The BNPL
  // stub splits the total into 4 equal, interest-free installments (mimicking
  // Tabby/Tamara) — a real provider gets swapped in during the payments phase.
  const priceNumber = Number(product.price.toString());
  const installment = priceNumber / 4;

  // Sale price + discount badge, and a (mocked) estimated delivery date.
  const compareAt =
    product.compareAtPrice != null ? Number(product.compareAtPrice.toString()) : null;
  const discountPct =
    compareAt && compareAt > priceNumber
      ? Math.round((1 - priceNumber / compareAt) * 100)
      : null;
  const eta = new Date();
  eta.setDate(eta.getDate() + 3);
  const etaLabel = eta.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  // Only render specs that are a plain object of key/values.
  const specsEntries =
    product.specs && typeof product.specs === "object" && !Array.isArray(product.specs)
      ? Object.entries(product.specs as Record<string, unknown>)
      : [];

  const stock = product.stock;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/products" className="hover:text-slate-900">
          All Products
        </Link>
        <span className="mx-1 text-slate-300">/</span>
        <Link href={`/category/${product.category.slug}`} className="hover:text-slate-900">
          {product.category.name}
        </Link>
        <span className="mx-1 text-slate-300">/</span>
        <span className="text-slate-700">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Left: gallery */}
        <ProductGallery images={product.images} name={product.name} />

        {/* Right: purchase info */}
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-blue-600">
            {product.brand.name}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {product.name}
          </h1>

          {product.rating != null && (
            <div className="mt-2">
              <RatingStars rating={product.rating} count={product.reviewCount} size="md" />
            </div>
          )}

          {/* Live stock — updates over SSE the moment it changes anywhere. */}
          <div className="mt-4">
            <LiveStock productId={product.id} initialStock={stock} />
          </div>

          {/* Price + BNPL split */}
          <div className="mt-6">
            <div className="flex flex-wrap items-baseline gap-3">
              <p className="text-3xl font-bold text-slate-900">
                {formatQAR(product.price)}
              </p>
              {compareAt && discountPct !== null && (
                <>
                  <span className="text-lg text-slate-400 line-through">
                    {formatQAR(compareAt)}
                  </span>
                  <span className="rounded-full bg-rose-600 px-2 py-0.5 text-xs font-bold text-white">
                    Save {discountPct}%
                  </span>
                </>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              or 4 interest-free payments of{" "}
              <span className="font-semibold text-slate-700">
                {formatQAR(installment)}
              </span>{" "}
              with BNPL
            </p>
          </div>

          {/* CTA */}
          <div className="mt-6 max-w-sm space-y-3">
            <QuantityAddToCart productId={product.id} stock={stock} />
            <WishlistButton productId={product.id} initialWishlisted={wishlisted} />
            <div className="space-y-1.5 pt-1">
              <p className="flex items-center gap-1.5 text-sm text-slate-500">
                <TruckIcon className="h-4 w-4" />
                <span className="font-medium text-green-600">Free delivery</span> across Qatar
              </p>
              {stock > 0 && (
                <p className="text-sm text-slate-500">
                  Order today, get it by{" "}
                  <span className="font-medium text-slate-700">{etaLabel}</span>
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="mt-8 border-t border-slate-100 pt-6">
            <h2 className="text-sm font-semibold text-slate-900">Overview</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {product.description}
            </p>
          </div>

          {/* Specs table */}
          {specsEntries.length > 0 && (
            <div className="mt-6 border-t border-slate-100 pt-6">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">
                Specifications
              </h2>
              <dl className="overflow-hidden rounded-lg border border-slate-200">
                {specsEntries.map(([key, value], i) => (
                  <div
                    key={key}
                    className={`flex justify-between gap-4 px-4 py-2.5 text-sm ${
                      i % 2 === 0 ? "bg-white" : "bg-slate-50"
                    }`}
                  >
                    <dt className="text-slate-500">{prettifyKey(key)}</dt>
                    <dd className="text-right font-medium text-slate-900">
                      {formatSpecValue(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-xl font-semibold text-slate-900">
            You might also like
          </h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 3h15v13H1z" />
      <path d="M16 8h4l3 3v5h-7z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}
