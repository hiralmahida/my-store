// Read-side data access for orders (used by the checkout success page and,
// later, richer order history).

import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/src/lib/prisma";
import { withDbRetry } from "@/src/lib/db";

const orderInclude = {
  items: { include: { product: { select: { name: true, slug: true } } } },
  payment: true,
} satisfies Prisma.OrderInclude;

export type OrderWithDetails = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

/** Fetch a single order with its line items and payment, or null. */
export async function getOrderById(id: string): Promise<OrderWithDetails | null> {
  return withDbRetry(() =>
    prisma.order.findUnique({ where: { id }, include: orderInclude })
  );
}
