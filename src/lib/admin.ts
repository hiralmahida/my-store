// Read-side data access for the admin panel. All callers are behind the admin
// layout's role guard; these helpers focus on aggregation and listing.

import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/src/lib/prisma";
import { withDbRetry } from "@/src/lib/db";

// Revenue counts orders that represent real sales (not cancelled/refunded).
const REVENUE_STATUSES = ["PAID", "SHIPPED", "DELIVERED"] as const;
export const LOW_STOCK_THRESHOLD = 5;

function toNumber(value: { toString(): string } | null | undefined): number {
  return value == null ? 0 : Number(value.toString());
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// --- Dashboard --------------------------------------------------------------

export interface AdminStats {
  ordersToday: number;
  revenueToday: number;
  totalProducts: number;
  lowStock: number;
  totalCustomers: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const since = startOfToday();

  const [ordersToday, revenueAgg, totalProducts, lowStock, totalCustomers] =
    await withDbRetry(() =>
      prisma.$transaction([
        prisma.order.count({ where: { createdAt: { gte: since } } }),
        prisma.order.aggregate({
          _sum: { total: true },
          where: { createdAt: { gte: since }, status: { in: [...REVENUE_STATUSES] } },
        }),
        prisma.product.count({ where: { deletedAt: null } }),
        prisma.product.count({ where: { stock: { lte: LOW_STOCK_THRESHOLD }, deletedAt: null } }),
        prisma.user.count({ where: { role: "CUSTOMER" } }),
      ])
    );

  return {
    ordersToday,
    revenueToday: toNumber(revenueAgg._sum.total),
    totalProducts,
    lowStock,
    totalCustomers,
  };
}

/** Revenue per day for the last `days` days, oldest first (fills gaps with 0). */
export async function getRevenueByDay(
  days = 7
): Promise<{ date: string; revenue: number }[]> {
  const since = startOfToday();
  since.setDate(since.getDate() - (days - 1));

  const orders = await withDbRetry(() =>
    prisma.order.findMany({
      where: { createdAt: { gte: since }, status: { in: [...REVENUE_STATUSES] } },
      select: { total: true, createdAt: true },
    })
  );

  // Seed each of the last `days` days with 0.
  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const order of orders) {
    const key = order.createdAt.toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, buckets.get(key)! + toNumber(order.total));
  }

  return [...buckets.entries()].map(([date, revenue]) => ({ date, revenue }));
}

/** Best-selling products by units sold. */
export async function getTopProducts(
  limit = 5
): Promise<{ id: string; name: string; unitsSold: number }[]> {
  const grouped = await withDbRetry(() =>
    prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: limit,
    })
  );
  if (grouped.length === 0) return [];

  const products = await withDbRetry(() =>
    prisma.product.findMany({
      where: { id: { in: grouped.map((g) => g.productId) } },
      select: { id: true, name: true },
    })
  );
  const nameById = new Map(products.map((p) => [p.id, p.name]));

  return grouped.map((g) => ({
    id: g.productId,
    name: nameById.get(g.productId) ?? "(deleted product)",
    unitsSold: g._sum.quantity ?? 0,
  }));
}

/** Recent persisted notifications for the dashboard feed. */
export async function getRecentNotifications(limit = 20) {
  return withDbRetry(() =>
    prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: limit })
  );
}

// --- Products ---------------------------------------------------------------

export type AdminProductRow = Prisma.ProductGetPayload<{
  include: { brand: true; category: true };
}>;

export async function listAdminProducts(): Promise<AdminProductRow[]> {
  return withDbRetry(() =>
    prisma.product.findMany({
      where: { deletedAt: null }, // hide soft-deleted products from the admin list
      include: { brand: true, category: true },
      orderBy: { createdAt: "desc" },
    })
  );
}

export type AdminProductDetail = Prisma.ProductGetPayload<{
  include: { images: true };
}>;

export async function getAdminProduct(id: string): Promise<AdminProductDetail | null> {
  return withDbRetry(() =>
    prisma.product.findUnique({ where: { id }, include: { images: true } })
  );
}

// --- Orders -----------------------------------------------------------------

export type AdminOrderRow = Prisma.OrderGetPayload<{
  include: { payment: true; _count: { select: { items: true } } };
}>;

export async function listAdminOrders(status?: string): Promise<AdminOrderRow[]> {
  const where: Prisma.OrderWhereInput = {};
  // Only apply a valid status filter.
  const VALID = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];
  if (status && VALID.includes(status)) {
    where.status = status as Prisma.OrderWhereInput["status"];
  }

  return withDbRetry(() =>
    prisma.order.findMany({
      where,
      include: { payment: true, _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
      take: 500, // high cap so placed orders are never hidden from admin
    })
  );
}

export type AdminOrderDetail = Prisma.OrderGetPayload<{
  include: {
    items: { include: { product: { select: { name: true; slug: true } } } };
    payment: true;
    user: { select: { name: true; email: true } };
  };
}>;

export async function getAdminOrder(id: string): Promise<AdminOrderDetail | null> {
  return withDbRetry(() =>
    prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { name: true, slug: true } } } },
        payment: true,
        user: { select: { name: true, email: true } },
      },
    })
  );
}

// --- Customers --------------------------------------------------------------

export type CustomerRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  disabled: boolean;
  createdAt: Date;
  orderCount: number;
};

export async function listCustomers(): Promise<CustomerRow[]> {
  const users = await withDbRetry(() =>
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        disabled: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
    })
  );

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    disabled: u.disabled,
    createdAt: u.createdAt,
    orderCount: u._count.orders,
  }));
}
