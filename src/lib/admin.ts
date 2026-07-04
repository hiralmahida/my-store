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

/** Best-selling products by units sold, optionally within a date range. */
export async function getTopProducts(
  limit = 5,
  range?: { from: Date; to: Date }
): Promise<{ id: string; name: string; unitsSold: number }[]> {
  const grouped = await withDbRetry(() =>
    prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      where: range
        ? { order: { createdAt: { gte: range.from, lte: range.to } } }
        : undefined,
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

// Saved views → status filter (undefined = no status filter, i.e. all).
export const ORDER_VIEWS: { key: string; label: string; status?: string }[] = [
  { key: "all", label: "All" },
  { key: "unfulfilled", label: "Unfulfilled", status: "PAID" },
  { key: "shipped", label: "Shipped", status: "SHIPPED" },
  { key: "delivered", label: "Delivered", status: "DELIVERED" },
  { key: "cancelled", label: "Cancelled", status: "CANCELLED" },
  { key: "refunded", label: "Refunded", status: "REFUNDED" },
];

export interface OrderListParams {
  view?: string;
  q?: string;
  sort?: string;
  dir?: string;
  page?: number;
  perPage?: number;
}

export interface OrderListResult {
  rows: AdminOrderRow[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

function buildOrderWhere(params: OrderListParams): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};
  const view = ORDER_VIEWS.find((v) => v.key === (params.view ?? "all"));
  if (view?.status) where.status = view.status as Prisma.OrderWhereInput["status"];

  const q = params.q?.trim();
  if (q) {
    where.OR = [
      { customerName: { contains: q, mode: "insensitive" } },
      { customerEmail: { contains: q, mode: "insensitive" } },
      { id: { contains: q.toLowerCase() } },
    ];
  }
  return where;
}

function orderOrderBy(sort?: string, dir?: string): Prisma.OrderOrderByWithRelationInput {
  const d: "asc" | "desc" = dir === "asc" ? "asc" : "desc";
  switch (sort) {
    case "total":
      return { total: d };
    case "status":
      return { status: d };
    case "customer":
      return { customerName: d };
    case "date":
    default:
      return { createdAt: d };
  }
}

export async function listAdminOrders(params: OrderListParams = {}): Promise<OrderListResult> {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const perPage = Math.min(100, Math.max(5, Math.floor(params.perPage ?? 20)));
  const where = buildOrderWhere(params);

  const [rows, total] = await withDbRetry(() =>
    prisma.$transaction([
      prisma.order.findMany({
        where,
        include: { payment: true, _count: { select: { items: true } } },
        orderBy: orderOrderBy(params.sort, params.dir),
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.order.count({ where }),
    ])
  );

  return { rows, total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

/** All matching orders (no pagination) for CSV export. */
export async function getOrdersForExport(params: OrderListParams = {}) {
  return withDbRetry(() =>
    prisma.order.findMany({
      where: buildOrderWhere(params),
      include: { _count: { select: { items: true } }, payment: { select: { method: true } } },
      orderBy: orderOrderBy(params.sort, params.dir),
      take: 5000,
    })
  );
}

export type AdminOrderDetail = Prisma.OrderGetPayload<{
  include: {
    items: {
      include: {
        product: {
          select: {
            name: true;
            slug: true;
            images: { take: 1; select: { url: true; alt: true } };
          };
        };
      };
    };
    payment: true;
    user: { select: { name: true; email: true } };
    events: true;
  };
}>;

export async function getAdminOrder(id: string): Promise<AdminOrderDetail | null> {
  return withDbRetry(() =>
    prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                slug: true,
                images: { take: 1, select: { url: true, alt: true } },
              },
            },
          },
        },
        payment: true,
        user: { select: { name: true, email: true } },
        events: { orderBy: { createdAt: "asc" } },
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

// --- Dashboard date ranges & metrics ---------------------------------------

export type DateRange = { from: Date; to: Date; key: string; label: string };

/** Resolve a dashboard date range from URL params (today / 7d / 30d / 90d /
 *  custom from+to). Defaults to the last 30 days. */
export function resolveRange(params: {
  range?: string;
  from?: string;
  to?: string;
}): DateRange {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const today0 = new Date(now);
  today0.setHours(0, 0, 0, 0);
  const daysBack = (n: number) => {
    const f = new Date(today0);
    f.setDate(f.getDate() - n);
    return f;
  };

  if (params.from && params.to) {
    const from = new Date(params.from);
    const to = new Date(params.to);
    if (!isNaN(from.getTime()) && !isNaN(to.getTime()) && from <= to) {
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      return { from, to, key: "custom", label: `${params.from} → ${params.to}` };
    }
  }

  switch (params.range) {
    case "today":
      return { from: today0, to: end, key: "today", label: "Today" };
    case "7d":
      return { from: daysBack(6), to: end, key: "7d", label: "Last 7 days" };
    case "90d":
      return { from: daysBack(89), to: end, key: "90d", label: "Last 90 days" };
    case "30d":
    default:
      return { from: daysBack(29), to: end, key: "30d", label: "Last 30 days" };
  }
}

export interface DashboardMetrics {
  revenue: number;
  orders: number; // all orders placed in range
  salesOrders: number; // revenue-generating orders (for AOV)
  aov: number;
  customers: number; // total registered customers
}

export async function getDashboardMetrics(range: DateRange): Promise<DashboardMetrics> {
  const revenueWhere = {
    createdAt: { gte: range.from, lte: range.to },
    status: { in: [...REVENUE_STATUSES] },
  };
  const [salesOrders, revenueAgg, allOrders, customers] = await withDbRetry(() =>
    prisma.$transaction([
      prisma.order.count({ where: revenueWhere }),
      prisma.order.aggregate({ _sum: { total: true }, where: revenueWhere }),
      prisma.order.count({ where: { createdAt: { gte: range.from, lte: range.to } } }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
    ])
  );
  const revenue = toNumber(revenueAgg._sum.total);
  return {
    revenue,
    orders: allOrders,
    salesOrders,
    aov: salesOrders > 0 ? revenue / salesOrders : 0,
    customers,
  };
}

/** Daily revenue buckets across the range (capped at 92 buckets). */
export async function getSalesSeries(
  range: DateRange
): Promise<{ date: string; revenue: number }[]> {
  const orders = await withDbRetry(() =>
    prisma.order.findMany({
      where: {
        createdAt: { gte: range.from, lte: range.to },
        status: { in: [...REVENUE_STATUSES] },
      },
      select: { total: true, createdAt: true },
    })
  );

  const dayMs = 86_400_000;
  const start = new Date(range.from);
  start.setHours(0, 0, 0, 0);
  const endDay = new Date(range.to);
  endDay.setHours(0, 0, 0, 0);
  const days = Math.min(92, Math.max(1, Math.round((endDay.getTime() - start.getTime()) / dayMs) + 1));

  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const o of orders) {
    const key = o.createdAt.toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, buckets.get(key)! + toNumber(o.total));
  }
  return [...buckets.entries()].map(([date, revenue]) => ({ date, revenue }));
}

/** Most recent orders for the dashboard panel. */
export async function getRecentOrders(limit = 8) {
  return withDbRetry(() =>
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, customerName: true, total: true, status: true, createdAt: true },
    })
  );
}

/** Products at or below the low-stock threshold. */
export async function getLowStockProducts(limit = 8) {
  return withDbRetry(() =>
    prisma.product.findMany({
      where: { deletedAt: null, stock: { lte: LOW_STOCK_THRESHOLD } },
      orderBy: { stock: "asc" },
      take: limit,
      select: { id: true, name: true, slug: true, stock: true },
    })
  );
}

// --- Global admin search ----------------------------------------------------

export async function adminSearch(query: string) {
  const term = query.trim();
  if (!term) return { orders: [], products: [], customers: [] };

  const [orders, products, customers] = await withDbRetry(() =>
    prisma.$transaction([
      prisma.order.findMany({
        where: {
          OR: [
            { customerName: { contains: term, mode: "insensitive" } },
            { customerEmail: { contains: term, mode: "insensitive" } },
            { id: { contains: term.toLowerCase() } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, customerName: true, total: true, status: true, createdAt: true },
      }),
      prisma.product.findMany({
        where: {
          deletedAt: null,
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { brand: { name: { contains: term, mode: "insensitive" } } },
          ],
        },
        take: 8,
        select: { id: true, name: true, slug: true, price: true, stock: true },
      }),
      prisma.user.findMany({
        where: {
          role: "CUSTOMER",
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { email: { contains: term, mode: "insensitive" } },
          ],
        },
        take: 8,
        select: { id: true, name: true, email: true },
      }),
    ])
  );

  return { orders, products, customers };
}
