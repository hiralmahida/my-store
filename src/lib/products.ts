// Data-access helpers for the product catalog. Keeping queries here (instead of
// inline in pages) keeps components tidy, lets us reuse them, and gives every
// caller the same precisely-typed result.

import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/src/lib/prisma";
import { withDbRetry } from "@/src/lib/db";

// The exact related data a product *card* needs: its brand name and one image.
// Declaring it `satisfies Prisma.ProductInclude` gives us type-checking here and
// lets us derive the card's row type from it below, so the type can never drift
// out of sync with the query.
const cardInclude = {
  brand: true,
  images: { take: 1 },
} satisfies Prisma.ProductInclude;

// The row shape a `ProductCard` receives. Derived from `cardInclude` so it
// always matches exactly what the queries below select.
export type ProductCardData = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

// Kept for backwards compatibility with existing imports (homepage/ProductCard).
export type FeaturedProduct = ProductCardData;

/**
 * Fetch products flagged as `featured`, newest first, with just enough related
 * data to render a card.
 */
export async function getFeaturedProducts(limit = 8): Promise<ProductCardData[]> {
  return withDbRetry(() =>
    prisma.product.findMany({
      where: { featured: true },
      include: cardInclude,
      orderBy: { createdAt: "desc" },
      take: limit,
    })
  );
}

// --- Listing with filters, sorting, and pagination -------------------------

// Sort options exposed in the UI. The string values double as the `?sort=`
// query-param values, so they must stay URL-friendly.
export const PRODUCT_SORTS = ["newest", "price-asc", "price-desc", "name-asc"] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export interface ProductFilters {
  categorySlug?: string;
  brandSlugs?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  search?: string;
  sort?: ProductSort;
  page?: number;
  perPage?: number;
}

export interface ProductListResult {
  products: ProductCardData[];
  total: number; // total matching rows (across all pages)
  page: number; // current 1-based page
  perPage: number;
  totalPages: number;
}

// Translate a sort key into a Prisma orderBy clause.
function orderByFor(sort: ProductSort): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "price-asc":
      return { price: "asc" };
    case "price-desc":
      return { price: "desc" };
    case "name-asc":
      return { name: "asc" };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
}

/**
 * List products matching the given filters, one page at a time. Returns the
 * page of rows plus enough metadata to render pagination controls.
 *
 * All filtering, sorting, and pagination happens in the database, so pages stay
 * fast even with a large catalog.
 */
export async function listProducts(filters: ProductFilters = {}): Promise<ProductListResult> {
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const perPage = Math.min(48, Math.max(1, Math.floor(filters.perPage ?? 12)));

  // Build the WHERE clause from whichever filters are present.
  const where: Prisma.ProductWhereInput = {};

  if (filters.categorySlug) {
    where.category = { slug: filters.categorySlug };
  }

  if (filters.brandSlugs && filters.brandSlugs.length > 0) {
    where.brand = { slug: { in: filters.brandSlugs } };
  }

  if (filters.inStockOnly) {
    where.stock = { gt: 0 };
  }

  // Price range. Only add bounds that were actually provided.
  if (filters.minPrice != null || filters.maxPrice != null) {
    where.price = {};
    if (filters.minPrice != null) where.price.gte = filters.minPrice;
    if (filters.maxPrice != null) where.price.lte = filters.maxPrice;
  }

  // Free-text search across product name, description, brand and category
  // (all partial + case-insensitive), so "iphone", "apple" and "phones" all
  // return the expected products.
  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { brand: { name: { contains: q, mode: "insensitive" } } },
      { category: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const sort = filters.sort ?? "newest";

  // Run the page query and the total count together in one round-trip.
  // Generous maxWait/timeout + retry keep this resilient to a cold Neon start.
  const [products, total] = await withDbRetry(() =>
    prisma.$transaction(
      [
        prisma.product.findMany({
          where,
          include: cardInclude,
          orderBy: orderByFor(sort),
          skip: (page - 1) * perPage,
          take: perPage,
        }),
        prisma.product.count({ where }),
      ],
      { maxWait: 15000, timeout: 20000 }
    )
  );

  return {
    products,
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

// --- Single product + related ----------------------------------------------

// Everything the product detail page needs: all images, brand, and category.
const detailInclude = {
  brand: true,
  category: true,
  images: true,
} satisfies Prisma.ProductInclude;

export type ProductDetail = Prisma.ProductGetPayload<{ include: typeof detailInclude }>;

/** Fetch one product by its URL slug, or `null` if it doesn't exist. */
export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  return withDbRetry(() =>
    prisma.product.findUnique({
      where: { slug },
      include: detailInclude,
    })
  );
}

/**
 * Products related to the given one: same category, excluding the product
 * itself, newest first.
 */
export async function getRelatedProducts(
  product: Pick<ProductDetail, "id" | "categoryId">,
  limit = 4
): Promise<ProductCardData[]> {
  return withDbRetry(() =>
    prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: product.id },
      },
      include: cardInclude,
      orderBy: { createdAt: "desc" },
      take: limit,
    })
  );
}

// --- Categories & brands (for nav and filter controls) ---------------------

export type CategoryOption = { id: string; name: string; slug: string; image: string | null };

/** All categories, alphabetical — used by the nav and category filters. */
export async function getCategories(): Promise<CategoryOption[]> {
  return withDbRetry(() =>
    prisma.category.findMany({
      select: { id: true, name: true, slug: true, image: true },
      orderBy: { name: "asc" },
    })
  );
}

/** Look up a single category by slug (for category landing pages). */
export async function getCategoryBySlug(slug: string): Promise<CategoryOption | null> {
  return withDbRetry(() =>
    prisma.category.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, image: true },
    })
  );
}

export type BrandOption = { id: string; name: string; slug: string };

/** All brands, alphabetical — used by the brand filter checkboxes. */
export async function getBrands(): Promise<BrandOption[]> {
  return withDbRetry(() =>
    prisma.brand.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    })
  );
}
