// Search results page: /search?q=...
//
// The header's search box submits here. We reuse the same catalog view, seeded
// with the free-text query, so shoppers can further filter and sort results.

import type { Metadata } from "next";
import CatalogView from "@/app/components/CatalogView";
import { getBrands, getCategories, listProducts } from "@/src/lib/products";
import { parseProductFilters, type RawSearchParams } from "@/src/lib/catalog-params";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search — FirstStop",
  description: "Search the FirstStop catalog.",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const filters = parseProductFilters(await searchParams);
  const query = filters.search ?? "";

  const [result, brands, categories] = await Promise.all([
    listProducts(filters),
    getBrands(),
    getCategories(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {query ? (
            <>
              Search results for{" "}
              <span className="text-blue-600">&ldquo;{query}&rdquo;</span>
            </>
          ) : (
            "Search"
          )}
        </h1>
        {query ? (
          <p className="mt-1 text-sm text-slate-500">
            {result.total} match{result.total === 1 ? "" : "es"} found.
          </p>
        ) : (
          <p className="mt-1 text-sm text-slate-500">
            Type in the search box above to find products.
          </p>
        )}
      </header>

      <CatalogView
        basePath="/search"
        filters={filters}
        result={result}
        brands={brands}
        categories={categories}
        emptyMessage={
          query
            ? `No products found for “${query}”.`
            : "No products match your filters."
        }
      />
    </div>
  );
}
