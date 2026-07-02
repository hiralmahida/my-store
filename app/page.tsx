// Homepage.
//
// An async Server Component: it awaits data directly (no getServerSideProps, no
// API route). It renders a hero, category tiles, and a featured-products grid.

import Link from "next/link";
import ProductCard from "./components/ProductCard";
import { getCategories, getFeaturedProducts } from "@/src/lib/products";

// Render on every request so featured products and categories stay fresh and
// the build doesn't need a live database connection.
export const dynamic = "force-dynamic";

export default async function Home() {
  // Both queries run on the server, in parallel. Credentials and SQL never
  // reach the browser.
  const [featured, categories] = await Promise.all([
    getFeaturedProducts(8),
    getCategories(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Hero band */}
      <section className="mb-12 rounded-2xl bg-gradient-to-r from-slate-900 to-blue-800 px-6 py-14 text-white sm:px-12">
        <p className="text-sm font-medium uppercase tracking-widest text-blue-300">
          FirstStop
        </p>
        <h1 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          The latest electronics, delivered across Qatar.
        </h1>
        <p className="mt-3 max-w-xl text-blue-100">
          Phones, laptops, tablets, TVs, appliances and accessories — all priced
          in QAR, with free local delivery and interest-free installments.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-blue-50"
        >
          Shop all products
          <span aria-hidden="true">→</span>
        </Link>
      </section>

      {/* Category tiles */}
      {categories.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-6 text-xl font-semibold text-slate-900">
            Shop by category
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="group flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 text-center transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-lg font-bold text-blue-600 transition group-hover:bg-blue-100">
                  {category.name.charAt(0)}
                </span>
                <span className="text-sm font-medium text-slate-700">
                  {category.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured products grid */}
      <section>
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-xl font-semibold text-slate-900">
            Featured products
          </h2>
          <Link
            href="/products"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View all →
          </Link>
        </div>

        {featured.length === 0 ? (
          // Friendly empty state — most likely the database isn't seeded yet.
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
            <p className="font-medium text-slate-900">No featured products yet.</p>
            <p className="mt-1 text-sm text-slate-500">
              Run the database seed script (see the README) to add sample
              products.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
