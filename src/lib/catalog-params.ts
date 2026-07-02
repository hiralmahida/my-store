// Helpers to translate URL search params <-> catalog filters.
//
// The storefront does all filtering on the server, driven entirely by the URL
// query string (e.g. `/products?brand=apple&min=1000&sort=price-asc&page=2`).
// Keeping URLs as the single source of truth means filters are shareable,
// bookmarkable, and work without any client-side JavaScript.

import type { ProductFilters, ProductSort } from "@/src/lib/products";
import { PRODUCT_SORTS } from "@/src/lib/products";

// The shape Next.js gives us for `searchParams` (after awaiting the promise).
export type RawSearchParams = { [key: string]: string | string[] | undefined };

// A repeated param (e.g. `?brand=a&brand=b`) arrives as an array; a single one
// as a string. These tiny helpers normalize both cases.
function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
function all(value: string | string[] | undefined): string[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}
function toPositiveInt(value: string | undefined): number | undefined {
  if (value == null || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
}

/**
 * Parse raw URL search params into a validated {@link ProductFilters} object.
 * Unknown/invalid values fall back to sensible defaults, so a hand-edited URL
 * can never crash the page.
 */
export function parseProductFilters(sp: RawSearchParams): ProductFilters {
  const sortRaw = first(sp.sort);
  const sort: ProductSort = (PRODUCT_SORTS as readonly string[]).includes(sortRaw ?? "")
    ? (sortRaw as ProductSort)
    : "newest";

  const page = toPositiveInt(first(sp.page)) ?? 1;

  return {
    brandSlugs: all(sp.brand),
    minPrice: toPositiveInt(first(sp.min)),
    maxPrice: toPositiveInt(first(sp.max)),
    inStockOnly: first(sp.instock) === "1",
    search: first(sp.q)?.trim() || undefined,
    sort,
    page: Math.max(1, page),
  };
}

/**
 * Serialize filters back into a query string (with leading `?`, or "" if
 * empty). `overrides` let a caller change one value — e.g. pagination links
 * pass `{ page: 3 }` while keeping every other active filter intact. Set an
 * override to `undefined`/`""` to remove that key.
 *
 * Note: the category is intentionally NOT encoded here — category is expressed
 * through the URL path (`/category/[slug]`), not a query param.
 */
export function buildQueryString(
  filters: ProductFilters,
  overrides: Record<string, string | number | undefined> = {}
): string {
  const params = new URLSearchParams();

  for (const brand of filters.brandSlugs ?? []) params.append("brand", brand);
  if (filters.minPrice != null) params.set("min", String(filters.minPrice));
  if (filters.maxPrice != null) params.set("max", String(filters.maxPrice));
  if (filters.inStockOnly) params.set("instock", "1");
  if (filters.search) params.set("q", filters.search);
  if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));

  for (const [key, value] of Object.entries(overrides)) {
    if (value == null || value === "") params.delete(key);
    else params.set(key, String(value));
  }

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

// Human-readable labels for each sort option, for use in the sort dropdown.
export const SORT_LABELS: Record<ProductSort, string> = {
  newest: "Newest",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
  "name-asc": "Name: A to Z",
};
