// Category landing page: /category/[slug]
//
// Same catalog view as /products, but scoped to a single category (taken from
// the URL path). All other filters (brand, price, availability, sort) still
// apply on top of the category.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CatalogView from "@/app/components/CatalogView";
import {
  getBrands,
  getCategories,
  getCategoryBySlug,
  listProducts,
} from "@/src/lib/products";
import { parseProductFilters, type RawSearchParams } from "@/src/lib/catalog-params";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Category not found — FirstStop" };
  return {
    title: `${category.name} — FirstStop`,
    description: `Shop ${category.name} at FirstStop. Filter by brand, price and availability. Prices in QAR.`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { slug } = await params;

  const category = await getCategoryBySlug(slug);
  if (!category) notFound(); // renders the nearest not-found UI (404)

  // Merge the path-based category into the URL-based filters.
  const filters = { ...parseProductFilters(await searchParams), categorySlug: slug };

  const [result, brands, categories] = await Promise.all([
    listProducts(filters),
    getBrands(),
    getCategories(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <nav className="mb-2 text-sm text-slate-500" aria-label="Breadcrumb">
          <a href="/products" className="hover:text-slate-900">
            All Products
          </a>{" "}
          <span className="mx-1 text-slate-300">/</span>
          <span className="text-slate-700">{category.name}</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {category.name}
        </h1>
      </header>

      <CatalogView
        basePath={`/category/${slug}`}
        filters={filters}
        result={result}
        brands={brands}
        categories={categories}
        activeCategorySlug={slug}
        emptyMessage={`No ${category.name} match your filters.`}
      />
    </div>
  );
}
