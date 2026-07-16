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

export const PRODUCT_STATUSES = ["ACTIVE", "DRAFT", "ARCHIVED"] as const;
export type ProductStatusValue = (typeof PRODUCT_STATUSES)[number];

export interface AdminProductListParams {
  q?: string;
  status?: string; // one of PRODUCT_STATUSES; undefined = all
  sort?: string; // name | price | stock | created
  dir?: string;
  page?: number;
  perPage?: number;
}

/** A serializable product row for the admin list (Decimals → numbers). */
export interface AdminProductRow {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  lowStockThreshold: number;
  status: string;
  featured: boolean;
  brandName: string;
  categoryName: string;
  image: string | null;
  variantCount: number;
}

export interface AdminProductListResult {
  rows: AdminProductRow[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  counts: { all: number; active: number; draft: number; archived: number };
}

function buildProductWhere(params: AdminProductListParams): Prisma.ProductWhereInput {
  // Soft-deleted products never appear in the admin catalog list.
  const where: Prisma.ProductWhereInput = { deletedAt: null };
  const q = params.q?.trim();
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
      { brand: { name: { contains: q, mode: "insensitive" } } },
    ];
  }
  return where;
}

function productOrderBy(sort?: string, dir?: string): Prisma.ProductOrderByWithRelationInput {
  const d: "asc" | "desc" = dir === "asc" ? "asc" : "desc";
  switch (sort) {
    case "name":
      return { name: d };
    case "price":
      return { price: d };
    case "stock":
      return { stock: d };
    case "created":
    default:
      return { createdAt: d };
  }
}

export async function listAdminProducts(
  params: AdminProductListParams = {}
): Promise<AdminProductListResult> {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const perPage = Math.min(100, Math.max(5, Math.floor(params.perPage ?? 20)));
  const baseWhere = buildProductWhere(params);

  // Status tabs count within the current search but ignore the status filter.
  const statusValid =
    params.status && (PRODUCT_STATUSES as readonly string[]).includes(params.status)
      ? (params.status as ProductStatusValue)
      : undefined;
  const where: Prisma.ProductWhereInput = statusValid
    ? { ...baseWhere, status: statusValid }
    : baseWhere;

  const [products, total, grouped] = await withDbRetry(() =>
    prisma.$transaction(
      [
        prisma.product.findMany({
          where,
          include: {
            brand: { select: { name: true } },
            category: { select: { name: true } },
            images: { take: 1, orderBy: { position: "asc" }, select: { url: true } },
            _count: { select: { variants: true } },
          },
          orderBy: productOrderBy(params.sort, params.dir),
          skip: (page - 1) * perPage,
          take: perPage,
        }),
        prisma.product.count({ where }),
        prisma.product.groupBy({ by: ["status"], where: baseWhere, _count: true }),
      ],
      { maxWait: 15000, timeout: 20000 }
    )
  );

  const byStatus = new Map(grouped.map((g) => [g.status, g._count]));
  const active = byStatus.get("ACTIVE") ?? 0;
  const draft = byStatus.get("DRAFT") ?? 0;
  const archived = byStatus.get("ARCHIVED") ?? 0;

  return {
    rows: products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: toNumber(p.price),
      compareAtPrice: p.compareAtPrice == null ? null : toNumber(p.compareAtPrice),
      stock: p.stock,
      lowStockThreshold: p.lowStockThreshold,
      status: p.status,
      featured: p.featured,
      brandName: p.brand.name,
      categoryName: p.category.name,
      image: p.images[0]?.url ?? null,
      variantCount: p._count.variants,
    })),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    counts: { all: active + draft + archived, active, draft, archived },
  };
}

export type AdminProductDetail = Prisma.ProductGetPayload<{
  include: {
    images: { orderBy: { position: "asc" } };
    variants: { orderBy: { position: "asc" } };
  };
}>;

export async function getAdminProduct(id: string): Promise<AdminProductDetail | null> {
  return withDbRetry(() =>
    prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { position: "asc" } },
        variants: { orderBy: { position: "asc" } },
      },
    })
  );
}

// --- Inventory --------------------------------------------------------------

export const INVENTORY_FILTERS = ["all", "low", "out"] as const;

export interface InventoryParams {
  q?: string;
  filter?: string; // all | low | out
  page?: number;
  perPage?: number;
}

export interface InventoryVariantRow {
  id: string;
  name: string;
  sku: string | null;
  stock: number;
}

export interface InventoryRow {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  status: string;
  stock: number;
  lowStockThreshold: number;
  low: boolean;
  out: boolean;
  variants: InventoryVariantRow[];
}

export interface InventoryResult {
  rows: InventoryRow[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  counts: { all: number; low: number; out: number };
}

/**
 * Inventory listing. Low-stock is a per-product threshold comparison
 * (`stock <= lowStockThreshold`), which Prisma can't express column-to-column,
 * so we fetch the (bounded) catalog and compute low/out + paginate in memory.
 * Fine for a modest catalog; revisit with a raw query if it grows large.
 */
export async function listInventory(params: InventoryParams = {}): Promise<InventoryResult> {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const perPage = Math.min(100, Math.max(5, Math.floor(params.perPage ?? 20)));
  const q = params.q?.trim();

  const where: Prisma.ProductWhereInput = { deletedAt: null };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { brand: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const products = await withDbRetry(() =>
    prisma.product.findMany({
      where,
      include: {
        images: { take: 1, orderBy: { position: "asc" }, select: { url: true } },
        variants: {
          orderBy: { position: "asc" },
          select: { id: true, name: true, sku: true, stock: true },
        },
      },
      orderBy: { stock: "asc" }, // scarcest first
      take: 1000,
    })
  );

  const all: InventoryRow[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    image: p.images[0]?.url ?? null,
    status: p.status,
    stock: p.stock,
    lowStockThreshold: p.lowStockThreshold,
    out: p.stock <= 0,
    low: p.stock > 0 && p.stock <= p.lowStockThreshold,
    variants: p.variants,
  }));

  const counts = {
    all: all.length,
    low: all.filter((r) => r.low).length,
    out: all.filter((r) => r.out).length,
  };

  const filter = (INVENTORY_FILTERS as readonly string[]).includes(params.filter ?? "")
    ? params.filter
    : "all";
  const filtered =
    filter === "low" ? all.filter((r) => r.low) : filter === "out" ? all.filter((r) => r.out) : all;

  const total = filtered.length;
  const rows = filtered.slice((page - 1) * perPage, page * perPage);

  return {
    rows,
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    counts,
  };
}

export type StockHistoryRow = Prisma.StockAdjustmentGetPayload<{
  include: { product: { select: { name: true; slug: true } }; variant: { select: { name: true } } };
}>;

/** Recent stock-change history, optionally scoped to one product. */
export async function getStockHistory(limit = 50, productId?: string): Promise<StockHistoryRow[]> {
  return withDbRetry(() =>
    prisma.stockAdjustment.findMany({
      where: productId ? { productId } : undefined,
      include: {
        product: { select: { name: true, slug: true } },
        variant: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    })
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

// Simple segments for filtering the customer list.
export const CUSTOMER_SEGMENTS = [
  { key: "all", label: "All customers" },
  { key: "repeat", label: "Repeat buyers" },
  { key: "high", label: "High spenders" },
] as const;

// Lifetime spend (QAR) at or above which a customer is a "high spender".
export const HIGH_SPENDER_THRESHOLD = 5000;

export type CustomerRow = {
  id: string;
  name: string;
  email: string;
  disabled: boolean;
  createdAt: Date;
  orderCount: number; // count of real (non-cancelled/refunded) orders
  spend: number; // lifetime spend in QAR
};

export interface CustomerListParams {
  q?: string;
  segment?: string;
}

/**
 * Compute lifetime spend per user id from real (revenue) orders. Returned as a
 * Map for O(1) lookup when assembling customer rows.
 */
async function spendByUser(userIds: string[]): Promise<Map<string, { spend: number; count: number }>> {
  const map = new Map<string, { spend: number; count: number }>();
  if (userIds.length === 0) return map;

  const grouped = await withDbRetry(() =>
    prisma.order.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, status: { in: [...REVENUE_STATUSES] } },
      _sum: { total: true },
      _count: { _all: true },
    })
  );

  for (const g of grouped) {
    if (!g.userId) continue;
    map.set(g.userId, { spend: toNumber(g._sum.total), count: g._count._all });
  }
  return map;
}

/**
 * The customer list (CUSTOMER role only — staff are managed in Settings), with
 * optional name/email search and a segment filter. Order counts and lifetime
 * spend reflect real sales (cancelled/refunded orders are excluded).
 */
export async function listCustomers(params: CustomerListParams = {}): Promise<CustomerRow[]> {
  const q = (params.q ?? "").trim();
  const segment = params.segment ?? "all";

  const users = await withDbRetry(() =>
    prisma.user.findMany({
      where: {
        role: "CUSTOMER",
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, disabled: true, createdAt: true },
    })
  );

  const spend = await spendByUser(users.map((u) => u.id));

  const rows: CustomerRow[] = users.map((u) => {
    const s = spend.get(u.id);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      disabled: u.disabled,
      createdAt: u.createdAt,
      orderCount: s?.count ?? 0,
      spend: s?.spend ?? 0,
    };
  });

  if (segment === "repeat") return rows.filter((r) => r.orderCount >= 2);
  if (segment === "high") return rows.filter((r) => r.spend >= HIGH_SPENDER_THRESHOLD);
  return rows;
}

export type CustomerDetail = Prisma.UserGetPayload<{
  select: {
    id: true;
    name: true;
    email: true;
    role: true;
    disabled: true;
    tags: true;
    notes: true;
    createdAt: true;
  };
}> & {
  orders: {
    id: string;
    total: number;
    discount: number;
    status: string;
    createdAt: Date;
    itemCount: number;
  }[];
  spend: number; // lifetime spend (revenue orders)
  orderCount: number; // count of revenue orders
};

/** A single customer's profile: contact, tags/notes, order history, lifetime value. */
export async function getCustomer(id: string): Promise<CustomerDetail | null> {
  const user = await withDbRetry(() =>
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        disabled: true,
        tags: true,
        notes: true,
        createdAt: true,
        orders: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            total: true,
            discount: true,
            status: true,
            createdAt: true,
            _count: { select: { items: true } },
          },
        },
      },
    })
  );
  if (!user) return null;

  const { orders, ...rest } = user;
  const revenue = orders.filter((o) => (REVENUE_STATUSES as readonly string[]).includes(o.status));

  return {
    ...rest,
    orders: orders.map((o) => ({
      id: o.id,
      total: toNumber(o.total),
      discount: toNumber(o.discount),
      status: o.status,
      createdAt: o.createdAt,
      itemCount: o._count.items,
    })),
    spend: revenue.reduce((sum, o) => sum + toNumber(o.total), 0),
    orderCount: revenue.length,
  };
}

// --- Coupons / discounts ----------------------------------------------------

export type CouponRow = Prisma.CouponGetPayload<{
  select: {
    id: true;
    code: true;
    description: true;
    type: true;
    value: true;
    minOrder: true;
    usageLimit: true;
    usageCount: true;
    expiresAt: true;
    active: true;
    automatic: true;
    _count: { select: { orders: true } };
  };
}>;

/** All coupons, newest first, for the discounts admin list. */
export async function listCoupons(): Promise<CouponRow[]> {
  return withDbRetry(() =>
    prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        code: true,
        description: true,
        type: true,
        value: true,
        minOrder: true,
        usageLimit: true,
        usageCount: true,
        expiresAt: true,
        active: true,
        automatic: true,
        _count: { select: { orders: true } },
      },
    })
  );
}

export async function getCoupon(id: string) {
  return withDbRetry(() => prisma.coupon.findUnique({ where: { id } }));
}

// --- Staff ------------------------------------------------------------------

export type StaffRow = Prisma.UserGetPayload<{
  select: {
    id: true;
    name: true;
    email: true;
    role: true;
    disabled: true;
    permissions: true;
    createdAt: true;
  };
}>;

/** All staff accounts (ADMIN + SUPERADMIN), for the Settings staff manager. */
export async function listStaff(): Promise<StaffRow[]> {
  return withDbRetry(() =>
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "SUPERADMIN"] } },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        disabled: true,
        permissions: true,
        createdAt: true,
      },
    })
  );
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

// --- Dashboard: Monthly target, categories & traffic ------------------------

export interface MonthlyTarget {
  target: number; // revenue goal for the current calendar month (QAR)
  revenue: number; // revenue booked so far this month
  today: number; // revenue booked today
  pct: number; // revenue / target, clamped to 0–100 for the gauge
}

/**
 * Progress toward this calendar month's revenue goal. There's no stored target,
 * so we derive a sensible one from last month's takings (×1.2, rounded up to a
 * tidy figure, with a floor) — swap in a StoreSetting field to make it explicit.
 */
export async function getMonthlyTarget(): Promise<MonthlyTarget> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const today0 = startOfToday();

  const revenueWhere = (from: Date, to?: Date) => ({
    createdAt: to ? { gte: from, lt: to } : { gte: from },
    status: { in: [...REVENUE_STATUSES] },
  });

  const [monthAgg, todayAgg, prevAgg] = await withDbRetry(() =>
    prisma.$transaction([
      prisma.order.aggregate({ _sum: { total: true }, where: revenueWhere(monthStart) }),
      prisma.order.aggregate({ _sum: { total: true }, where: revenueWhere(today0) }),
      prisma.order.aggregate({
        _sum: { total: true },
        where: revenueWhere(prevMonthStart, monthStart),
      }),
    ])
  );

  const revenue = toNumber(monthAgg._sum.total);
  const today = toNumber(todayAgg._sum.total);
  const prev = toNumber(prevAgg._sum.total);

  // Derive the goal from last month, rounded up to the nearest 1,000 QAR.
  const rawTarget = Math.max(prev * 1.2, revenue * 1.1, 50_000);
  const target = Math.max(1000, Math.ceil(rawTarget / 1000) * 1000);
  const pct = target > 0 ? Math.min(100, Math.round((revenue / target) * 100)) : 0;

  return { target, revenue, today, pct };
}

export interface TopCategory {
  name: string;
  revenue: number; // revenue in range (QAR)
  changePct: number | null; // vs the previous equal-length period (null = new)
}

/**
 * Best-selling categories by revenue within the range, each with its change
 * vs the immediately preceding equal-length period. Prisma can't group by a
 * relation column, so we sum line items in memory (bounded by `take`).
 */
export async function getTopCategories(range: DateRange, limit = 4): Promise<TopCategory[]> {
  const spanMs = range.to.getTime() - range.from.getTime();
  const prevFrom = new Date(range.from.getTime() - spanMs - 1);
  const prevTo = new Date(range.from.getTime() - 1);

  const select = {
    quantity: true,
    unitPrice: true,
    product: { select: { category: { select: { name: true } } } },
  } as const;

  const [current, previous] = await withDbRetry(() =>
    prisma.$transaction([
      prisma.orderItem.findMany({
        where: {
          order: { createdAt: { gte: range.from, lte: range.to }, status: { in: [...REVENUE_STATUSES] } },
        },
        select,
        take: 5000,
      }),
      prisma.orderItem.findMany({
        where: {
          order: { createdAt: { gte: prevFrom, lte: prevTo }, status: { in: [...REVENUE_STATUSES] } },
        },
        select,
        take: 5000,
      }),
    ])
  );

  const sumByCategory = (items: typeof current) => {
    const map = new Map<string, number>();
    for (const it of items) {
      const name = it.product.category.name;
      map.set(name, (map.get(name) ?? 0) + toNumber(it.unitPrice) * it.quantity);
    }
    return map;
  };

  const now = sumByCategory(current);
  const before = sumByCategory(previous);

  return [...now.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, revenue]) => {
      const prev = before.get(name) ?? 0;
      const changePct = prev > 0 ? Math.round(((revenue - prev) / prev) * 100) : null;
      return { name, revenue, changePct };
    });
}

export interface TrafficSource {
  name: string;
  value: number; // sessions attributed to the source
  pct: number; // share of total sessions (0–100)
}

/**
 * Traffic-source breakdown for the range. The store has no analytics pipeline,
 * so this is DERIVED, deterministic mock data: total sessions scale with real
 * order volume in the range, split across channels by fixed weights (seeded by
 * the range so the mix stays stable between renders). Replace with real
 * analytics by swapping this one function.
 */
export async function getTrafficSources(range: DateRange): Promise<{ total: number; sources: TrafficSource[] }> {
  const orders = await withDbRetry(() =>
    prisma.order.count({ where: { createdAt: { gte: range.from, lte: range.to } } })
  );

  // Assume a ~2.5% order conversion rate to back into a plausible session count.
  const total = Math.max(120, Math.round(orders / 0.025));

  const weights: { name: string; weight: number }[] = [
    { name: "Direct", weight: 32 },
    { name: "Google", weight: 28 },
    { name: "Social", weight: 20 },
    { name: "Referral", weight: 12 },
    { name: "Campaigns", weight: 8 },
  ];

  // A tiny, deterministic wobble seeded by the range length so the split looks
  // organic without changing on every request.
  const days = Math.max(1, Math.round((range.to.getTime() - range.from.getTime()) / 86_400_000));
  const wobble = (i: number) => ((days * (i + 3)) % 7) - 3; // -3..+3

  const adjusted = weights.map((w, i) => ({ ...w, weight: Math.max(1, w.weight + wobble(i)) }));
  const weightSum = adjusted.reduce((s, w) => s + w.weight, 0);

  const sources = adjusted.map((w) => {
    const pct = Math.round((w.weight / weightSum) * 100);
    return { name: w.name, value: Math.round((w.weight / weightSum) * total), pct };
  });

  return { total, sources };
}

// --- Transactions & invoices ------------------------------------------------

export const PAYMENT_STATUSES = ["PENDING", "SUCCEEDED", "FAILED"] as const;
export const PAYMENT_METHODS = ["CARD", "BNPL"] as const;

export interface TransactionListParams {
  q?: string;
  status?: string; // one of PAYMENT_STATUSES
  method?: string; // one of PAYMENT_METHODS
  page?: number;
  perPage?: number;
}

export interface TransactionRow {
  id: string;
  orderId: string;
  customerName: string;
  method: string;
  provider: string;
  reference: string;
  amount: number;
  status: string;
  createdAt: Date;
}

export interface TransactionListResult {
  rows: TransactionRow[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  counts: { all: number; succeeded: number; pending: number; failed: number };
  volume: number; // total QAR of SUCCEEDED payments matching the filter
}

function buildPaymentWhere(params: TransactionListParams): Prisma.PaymentWhereInput {
  const where: Prisma.PaymentWhereInput = {};
  if (params.status && (PAYMENT_STATUSES as readonly string[]).includes(params.status)) {
    where.status = params.status as Prisma.PaymentWhereInput["status"];
  }
  if (params.method && (PAYMENT_METHODS as readonly string[]).includes(params.method)) {
    where.method = params.method as Prisma.PaymentWhereInput["method"];
  }
  const q = params.q?.trim();
  if (q) {
    where.OR = [
      { reference: { contains: q, mode: "insensitive" } },
      { orderId: { contains: q.toLowerCase() } },
      { order: { customerName: { contains: q, mode: "insensitive" } } },
    ];
  }
  return where;
}

/** Payments list for the Sales & Payments → Transactions view. */
export async function listTransactions(
  params: TransactionListParams = {}
): Promise<TransactionListResult> {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const perPage = Math.min(100, Math.max(5, Math.floor(params.perPage ?? 20)));
  const where = buildPaymentWhere(params);

  const [payments, total, grouped, volumeAgg] = await withDbRetry(() =>
    prisma.$transaction([
      prisma.payment.findMany({
        where,
        include: { order: { select: { customerName: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.payment.count({ where }),
      prisma.payment.groupBy({ by: ["status"], _count: true }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { ...where, status: "SUCCEEDED" } }),
    ])
  );

  const byStatus = new Map(grouped.map((g) => [g.status, g._count]));

  return {
    rows: payments.map((p) => ({
      id: p.id,
      orderId: p.orderId,
      customerName: p.order.customerName,
      method: p.method,
      provider: p.provider,
      reference: p.reference,
      amount: toNumber(p.amount),
      status: p.status,
      createdAt: p.createdAt,
    })),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    counts: {
      all: [...byStatus.values()].reduce((s, n) => s + n, 0),
      succeeded: byStatus.get("SUCCEEDED") ?? 0,
      pending: byStatus.get("PENDING") ?? 0,
      failed: byStatus.get("FAILED") ?? 0,
    },
    volume: toNumber(volumeAgg._sum.amount),
  };
}

export interface InvoiceListParams {
  q?: string;
  page?: number;
  perPage?: number;
}

export interface InvoiceRow {
  orderId: string;
  number: string; // human invoice number derived from the order id
  customerName: string;
  customerEmail: string;
  total: number;
  status: string;
  paymentStatus: string | null;
  createdAt: Date;
}

export interface InvoiceListResult {
  rows: InvoiceRow[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  billed: number; // total QAR billed across matching invoices
}

/** Invoice number derived from an order id, e.g. "INV-9F3A1C2D". */
export function invoiceNumber(orderId: string): string {
  return `INV-${orderId.slice(-8).toUpperCase()}`;
}

/**
 * Invoices list for Sales & Payments → Invoices. Every order is billable, so
 * this lists orders (newest first) with their payment status; each links to the
 * existing printable invoice at /admin/orders/[id]/invoice.
 */
export async function listInvoices(params: InvoiceListParams = {}): Promise<InvoiceListResult> {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const perPage = Math.min(100, Math.max(5, Math.floor(params.perPage ?? 20)));

  const where: Prisma.OrderWhereInput = {};
  const q = params.q?.trim();
  if (q) {
    where.OR = [
      { customerName: { contains: q, mode: "insensitive" } },
      { customerEmail: { contains: q, mode: "insensitive" } },
      { id: { contains: q.toLowerCase() } },
    ];
  }

  const [orders, total, billedAgg] = await withDbRetry(() =>
    prisma.$transaction([
      prisma.order.findMany({
        where,
        include: { payment: { select: { status: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.order.count({ where }),
      prisma.order.aggregate({ _sum: { total: true }, where }),
    ])
  );

  return {
    rows: orders.map((o) => ({
      orderId: o.id,
      number: invoiceNumber(o.id),
      customerName: o.customerName,
      customerEmail: o.customerEmail,
      total: toNumber(o.total),
      status: o.status,
      paymentStatus: o.payment?.status ?? null,
      createdAt: o.createdAt,
    })),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    billed: toNumber(billedAgg._sum.total),
  };
}

// --- Categories -------------------------------------------------------------

export interface AdminCategoryRow {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  parentId: string | null;
  parentName: string | null;
  productCount: number;
  createdAt: Date;
}

/** All categories with product counts and parent names, for the categories admin. */
export async function listAdminCategories(): Promise<AdminCategoryRow[]> {
  const categories = await withDbRetry(() =>
    prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        parent: { select: { name: true } },
        _count: { select: { products: true } },
      },
    })
  );

  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    image: c.image,
    parentId: c.parentId,
    parentName: c.parent?.name ?? null,
    productCount: c._count.products,
    createdAt: c.createdAt,
  }));
}

export async function getAdminCategory(id: string) {
  return withDbRetry(() => prisma.category.findUnique({ where: { id } }));
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
