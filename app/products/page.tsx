// All-products listing page: /products
//
// Reads filters from the URL query string, queries the database, and renders
// the shared catalog view (filter sidebar + grid + pagination). Because it
// depends on `searchParams`, it renders dynamically at request time.

import type { Metadata } from "next";
import CatalogView from "@/app/components/CatalogView";
import { getBrands, getCategories, listProducts } from "@/src/lib/products";
import { parseProductFilters, type RawSearchParams } from "@/src/lib/catalog-params";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "All Products — FirstStop",
  description:
    "Browse every product at FirstStop — phones, laptops, tablets, TVs, appliances and accessories, priced in QAR.",
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const filters = parseProductFilters(await searchParams);

  // Fetch the page of results plus the brand/category lists for the sidebar,
  // all in parallel.
  const [result, brands, categories] = await Promise.all([
    listProducts(filters),
    getBrands(),
    getCategories(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          All Products
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          The full FirstStop catalog. Filter by brand, price and availability.
        </p>
      </header>

      <CatalogView
        basePath="/products"
        filters={filters}
        result={result}
        brands={brands}
        categories={categories}
      />
    </div>
  );
}
