// The shared catalog browsing UI: a filter sidebar + a results area with a
// sort control, product grid, and pagination. Reused by the all-products page,
// category pages, and search results.
//
// This is a Server Component and the filter form is a plain `method="get"`
// form, so filtering works entirely on the server with zero client JS: the
// browser submits the form, which becomes a new URL, which re-renders the page.

import Link from "next/link";
import ProductGrid from "./ProductGrid";
import Pagination from "./Pagination";
import type {
  BrandOption,
  CategoryOption,
  ProductFilters,
  ProductListResult,
} from "@/src/lib/products";
import { PRODUCT_SORTS } from "@/src/lib/products";
import { buildQueryString, SORT_LABELS } from "@/src/lib/catalog-params";

export default function CatalogView({
  basePath,
  filters,
  result,
  brands,
  categories,
  activeCategorySlug,
  emptyMessage,
}: {
  basePath: string;
  filters: ProductFilters;
  result: ProductListResult;
  brands: BrandOption[];
  categories: CategoryOption[];
  activeCategorySlug?: string;
  emptyMessage?: string;
}) {
  const selectedBrands = new Set(filters.brandSlugs ?? []);

  // "Clear" keeps only the free-text search (so clearing filters on the search
  // page doesn't lose the query); everything else resets to defaults.
  const clearHref = `${basePath}${buildQueryString({ search: filters.search })}`;

  // The first and last item numbers shown on this page, for the results count.
  const firstItem = result.total === 0 ? 0 : (result.page - 1) * result.perPage + 1;
  const lastItem = Math.min(result.page * result.perPage, result.total);

  return (
    <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
      {/* --- Filter sidebar -------------------------------------------------- */}
      <aside className="lg:sticky lg:top-32 lg:self-start">
        {/* Categories (navigation links, not part of the filter form) */}
        <div className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Categories</h2>
          <ul className="space-y-0.5 text-sm">
            <li>
              <Link
                href="/products"
                className={`block rounded-md px-2 py-1.5 transition hover:bg-slate-100 ${
                  !activeCategorySlug
                    ? "font-semibold text-blue-600"
                    : "text-slate-600"
                }`}
              >
                All products
              </Link>
            </li>
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/category/${category.slug}`}
                  className={`block rounded-md px-2 py-1.5 transition hover:bg-slate-100 ${
                    activeCategorySlug === category.slug
                      ? "font-semibold text-blue-600"
                      : "text-slate-600"
                  }`}
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Filters — one GET form. Submitting rebuilds the URL with the chosen
            filters and resets to page 1 (no page field is submitted). */}
        <form
          method="get"
          action={basePath}
          className="space-y-6 rounded-xl border border-slate-200 p-4"
        >
          {/* Preserve the search query across filter submits, if present. */}
          {filters.search ? (
            <input type="hidden" name="q" value={filters.search} />
          ) : null}

          {/* Sort */}
          <div>
            <label
              htmlFor="sort"
              className="mb-1.5 block text-sm font-semibold text-slate-900"
            >
              Sort by
            </label>
            <select
              id="sort"
              name="sort"
              defaultValue={filters.sort}
              className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {PRODUCT_SORTS.map((sort) => (
                <option key={sort} value={sort}>
                  {SORT_LABELS[sort]}
                </option>
              ))}
            </select>
          </div>

          {/* Brand checkboxes */}
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-slate-900">
              Brand
            </legend>
            <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
              {brands.map((brand) => (
                <label
                  key={brand.id}
                  className="flex items-center gap-2 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    name="brand"
                    value={brand.slug}
                    defaultChecked={selectedBrands.has(brand.slug)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  {brand.name}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Price range */}
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-slate-900">
              Price (QAR)
            </legend>
            <div className="flex items-center gap-2">
              <input
                type="number"
                name="min"
                min={0}
                placeholder="Min"
                defaultValue={filters.minPrice ?? ""}
                aria-label="Minimum price"
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <span className="text-slate-400">–</span>
              <input
                type="number"
                name="max"
                min={0}
                placeholder="Max"
                defaultValue={filters.maxPrice ?? ""}
                aria-label="Maximum price"
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </fieldset>

          {/* Availability */}
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="instock"
              value="1"
              defaultChecked={filters.inStockOnly ?? false}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            In stock only
          </label>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Apply
            </button>
            <Link
              href={clearHref}
              className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
            >
              Clear
            </Link>
          </div>
        </form>
      </aside>

      {/* --- Results --------------------------------------------------------- */}
      <div>
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-4">
          <p className="text-sm text-slate-500">
            {result.total === 0 ? (
              "No results"
            ) : (
              <>
                Showing <span className="font-medium text-slate-900">{firstItem}</span>
                –<span className="font-medium text-slate-900">{lastItem}</span> of{" "}
                <span className="font-medium text-slate-900">{result.total}</span>{" "}
                product{result.total === 1 ? "" : "s"}
              </>
            )}
          </p>
          <p className="text-sm text-slate-400">
            Sorted by {SORT_LABELS[filters.sort ?? "newest"]}
          </p>
        </div>

        <ProductGrid products={result.products} emptyMessage={emptyMessage} />

        <Pagination
          basePath={basePath}
          filters={filters}
          page={result.page}
          totalPages={result.totalPages}
        />
      </div>
    </div>
  );
}
