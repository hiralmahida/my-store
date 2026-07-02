// Homepage (temporary Phase 1 version).
//
// This is an async Server Component. In Next.js 16 you can `await` data
// directly in the component — no getServerSideProps, no API route. We query the
// database through the Prisma client and render the results. If this page shows
// products, our end-to-end database connection is working.

import ProductCard from "./components/ProductCard";
import { getFeaturedProducts } from "@/src/lib/products";

// Render this page on every request so featured products are always fresh and
// the build doesn't need a live database connection. (Later you can switch to
// cached/revalidated rendering for speed.)
export const dynamic = "force-dynamic";

export default async function Home() {
  // Runs on the server. Credentials and SQL never reach the browser.
  const featured = await getFeaturedProducts();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Simple hero band */}
      <section className="mb-10 rounded-2xl bg-gradient-to-r from-slate-900 to-blue-800 px-6 py-14 text-white sm:px-12">
        <p className="text-sm font-medium uppercase tracking-widest text-blue-300">
          VoltElectronics
        </p>
        <h1 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          The latest electronics, delivered across Qatar.
        </h1>
        <p className="mt-3 max-w-xl text-blue-100">
          Phones, laptops, audio, smart home and more — all priced in QAR.
        </p>
      </section>

      {/* Featured products grid */}
      <section>
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-xl font-semibold text-slate-900">
            Featured products
          </h2>
          <span className="text-sm text-slate-500">
            {featured.length} item{featured.length === 1 ? "" : "s"}
          </span>
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
