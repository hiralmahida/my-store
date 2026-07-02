// Product detail page: /product/[slug]
//
// Shows the image gallery, price + BNPL installment split, live-ready stock
// status, a specs table, the description, and related products.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductGallery from "@/app/components/ProductGallery";
import AddToCartButton from "@/app/components/AddToCartButton";
import ProductGrid from "@/app/components/ProductGrid";
import { getProductBySlug, getRelatedProducts } from "@/src/lib/products";
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
    title: `${product.name} — FirstStop`,
    description: product.description.slice(0, 160),
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

  const related = await getRelatedProducts(product);

  // Prices: Prisma returns a Decimal; convert once for arithmetic. The BNPL
  // stub splits the total into 4 equal, interest-free installments (mimicking
  // Tabby/Tamara) — a real provider gets swapped in during the payments phase.
  const priceNumber = Number(product.price.toString());
  const installment = priceNumber / 4;

  // Only render specs that are a plain object of key/values.
  const specsEntries =
    product.specs && typeof product.specs === "object" && !Array.isArray(product.specs)
      ? Object.entries(product.specs as Record<string, unknown>)
      : [];

  // Stock status → label + color.
  const stock = product.stock;
  const stockBadge =
    stock === 0
      ? { text: "Out of stock", className: "bg-slate-100 text-slate-500" }
      : stock <= 5
        ? { text: `Only ${stock} left`, className: "bg-amber-100 text-amber-800" }
        : { text: `In stock (${stock} available)`, className: "bg-green-100 text-green-800" };

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

          {/* Stock badge. In the real-time phase this becomes a live-updating
              indicator driven over WebSockets; the markup is ready for it. */}
          <div className="mt-4">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${stockBadge.className}`}
            >
              {stockBadge.text}
            </span>
          </div>

          {/* Price + BNPL split */}
          <div className="mt-6">
            <p className="text-3xl font-bold text-slate-900">
              {formatQAR(product.price)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              or 4 interest-free payments of{" "}
              <span className="font-semibold text-slate-700">
                {formatQAR(installment)}
              </span>{" "}
              with BNPL
            </p>
          </div>

          {/* CTA */}
          <div className="mt-6 max-w-sm">
            <AddToCartButton disabled={stock === 0} />
            <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-500">
              <TruckIcon className="h-4 w-4" />
              Free local delivery across Qatar
            </p>
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
