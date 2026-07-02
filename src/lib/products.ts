// Data-access helpers for products. Keeping queries here (instead of inline in
// pages) keeps components tidy and lets us reuse and type the results.

import { prisma } from "@/src/lib/prisma";

/**
 * Fetch products flagged as `featured`, newest first, with just enough related
 * data to render a card: the brand name and the first image.
 */
export async function getFeaturedProducts() {
  return prisma.product.findMany({
    where: { featured: true },
    include: {
      brand: true,
      images: { take: 1 }, // only need the primary image for the card
    },
    orderBy: { createdAt: "desc" },
  });
}

// The element type of the array returned above. Deriving it from the query
// means the type always matches exactly what we `include`, with no manual
// interface to keep in sync.
export type FeaturedProduct = Awaited<
  ReturnType<typeof getFeaturedProducts>
>[number];
