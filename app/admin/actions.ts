// Server Actions for the admin panel. Every action re-checks the admin role
// (defense in depth — never rely only on the page/layout guard).

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/src/lib/prisma";
import { withDbRetry } from "@/src/lib/db";
import { requireRole } from "@/src/lib/auth";
import { publishStockChange, publishOrderStatus } from "@/src/lib/events";
import type { OrderStatus } from "@/app/generated/prisma/client";

export interface AdminActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

async function ensureAdmin() {
  return requireRole(["ADMIN", "SUPERADMIN"]);
}

function statusLabel(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "PAID",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
];

// --- Products ---------------------------------------------------------------

interface ParsedProduct {
  values: {
    name: string;
    slug: string;
    description: string;
    price: number;
    stock: number;
    featured: boolean;
    categoryId: string;
    brandId: string;
    imageUrl: string;
  };
  fieldErrors: Record<string, string>;
}

function parseProductForm(formData: FormData): ParsedProduct {
  const name = String(formData.get("name") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const slug = slugRaw ? slugify(slugRaw) : slugify(name);
  const description = String(formData.get("description") ?? "").trim();
  const price = Number(formData.get("price"));
  const stock = Number(formData.get("stock"));
  const featured = formData.get("featured") != null;
  const categoryId = String(formData.get("categoryId") ?? "");
  const brandId = String(formData.get("brandId") ?? "");
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Enter a product name.";
  if (!slug) fieldErrors.slug = "Enter a valid slug.";
  if (description.length < 5) fieldErrors.description = "Enter a description.";
  if (!Number.isFinite(price) || price <= 0) fieldErrors.price = "Enter a price greater than 0.";
  if (!Number.isInteger(stock) || stock < 0) fieldErrors.stock = "Enter stock (0 or more).";
  if (!categoryId) fieldErrors.categoryId = "Choose a category.";
  if (!brandId) fieldErrors.brandId = "Choose a brand.";

  return {
    values: { name, slug, description, price, stock, featured, categoryId, brandId, imageUrl },
    fieldErrors,
  };
}

export async function createProduct(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await ensureAdmin();
  const { values, fieldErrors } = parseProductForm(formData);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const clash = await withDbRetry(() =>
    prisma.product.findUnique({ where: { slug: values.slug }, select: { id: true } })
  );
  if (clash) return { fieldErrors: { slug: "A product with this slug already exists." } };

  await withDbRetry(() =>
    prisma.product.create({
      data: {
        name: values.name,
        slug: values.slug,
        description: values.description,
        price: values.price,
        stock: values.stock,
        featured: values.featured,
        categoryId: values.categoryId,
        brandId: values.brandId,
        images: values.imageUrl
          ? { create: [{ url: values.imageUrl, alt: values.name }] }
          : undefined,
      },
    })
  );

  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function updateProduct(
  id: string,
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await ensureAdmin();
  const { values, fieldErrors } = parseProductForm(formData);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const clash = await withDbRetry(() =>
    prisma.product.findUnique({ where: { slug: values.slug }, select: { id: true } })
  );
  if (clash && clash.id !== id) {
    return { fieldErrors: { slug: "Another product already uses this slug." } };
  }

  const before = await withDbRetry(() =>
    prisma.product.findUnique({ where: { id }, select: { stock: true } })
  );

  await withDbRetry(() =>
    prisma.product.update({
      where: { id },
      data: {
        name: values.name,
        slug: values.slug,
        description: values.description,
        price: values.price,
        stock: values.stock,
        featured: values.featured,
        categoryId: values.categoryId,
        brandId: values.brandId,
        // If a new image URL is given, replace the gallery with it.
        ...(values.imageUrl
          ? { images: { deleteMany: {}, create: [{ url: values.imageUrl, alt: values.name }] } }
          : {}),
      },
    })
  );

  // If stock changed, broadcast it so any open product pages update live.
  if (before && before.stock !== values.stock) {
    publishStockChange(id, values.stock);
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  redirect("/admin/products");
}

export async function deleteProduct(id: string): Promise<void> {
  await ensureAdmin();
  // Product may be referenced by past order items; block deletion if so.
  const orderItems = await withDbRetry(() =>
    prisma.orderItem.count({ where: { productId: id } })
  );
  if (orderItems === 0) {
    // Not referenced anywhere — hard delete (cascades images/cart/wishlist).
    await withDbRetry(() => prisma.product.delete({ where: { id } }));
  } else {
    // Referenced by past orders — soft-delete: mark deleted so historical order
    // items still resolve, but it vanishes from the catalog and admin list.
    await withDbRetry(() =>
      prisma.product.update({
        where: { id },
        data: { deletedAt: new Date(), stock: 0, featured: false },
      })
    );
    publishStockChange(id, 0);
  }
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

// --- Orders -----------------------------------------------------------------

export async function updateOrderStatus(
  orderId: string,
  formData: FormData
): Promise<void> {
  const admin = await ensureAdmin();
  const status = String(formData.get("status") ?? "");
  if (!ORDER_STATUSES.includes(status as OrderStatus)) return;

  // Persist the status change AND a timeline event atomically, then push the
  // new status live to the customer (LiveOrderStatus subscribes) and revalidate
  // so the admin view reflects it too.
  await withDbRetry(() =>
    prisma.$transaction([
      prisma.order.update({ where: { id: orderId }, data: { status: status as OrderStatus } }),
      prisma.orderEvent.create({
        data: {
          orderId,
          type: "STATUS_CHANGE",
          message: `Marked as ${statusLabel(status)}`,
          actor: admin.name,
        },
      }),
    ])
  );

  publishOrderStatus(orderId, status);

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}

/** Change status for many orders at once (bulk action). */
export async function bulkUpdateOrderStatus(orderIds: string[], status: string): Promise<void> {
  const admin = await ensureAdmin();
  if (!ORDER_STATUSES.includes(status as OrderStatus) || orderIds.length === 0) return;

  await withDbRetry(() =>
    prisma.$transaction([
      prisma.order.updateMany({
        where: { id: { in: orderIds } },
        data: { status: status as OrderStatus },
      }),
      prisma.orderEvent.createMany({
        data: orderIds.map((id) => ({
          orderId: id,
          type: "STATUS_CHANGE" as const,
          message: `Marked as ${statusLabel(status)} (bulk update)`,
          actor: admin.name,
        })),
      }),
    ])
  );

  for (const id of orderIds) publishOrderStatus(id, status);
  revalidatePath("/admin/orders");
}

/** Add an internal note to an order's timeline. */
export async function addOrderNote(orderId: string, formData: FormData): Promise<void> {
  const admin = await ensureAdmin();
  const note = String(formData.get("note") ?? "").trim();
  if (!note) return;
  await withDbRetry(() =>
    prisma.orderEvent.create({
      data: { orderId, type: "NOTE", message: note, actor: admin.name },
    })
  );
  revalidatePath(`/admin/orders/${orderId}`);
}

/** Refund an order (marks it REFUNDED and logs a timeline event). */
export async function refundOrder(orderId: string): Promise<void> {
  const admin = await ensureAdmin();
  await withDbRetry(() =>
    prisma.$transaction([
      prisma.order.update({ where: { id: orderId }, data: { status: "REFUNDED" } }),
      prisma.orderEvent.create({
        data: {
          orderId,
          type: "REFUND",
          message: "Order refunded to original payment method",
          actor: admin.name,
        },
      }),
    ])
  );
  publishOrderStatus(orderId, "REFUNDED");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}

/** Add a tag to an order. */
export async function addOrderTag(orderId: string, formData: FormData): Promise<void> {
  await ensureAdmin();
  const tag = String(formData.get("tag") ?? "").trim().toLowerCase().replace(/\s+/g, "-");
  if (!tag) return;
  const order = await withDbRetry(() =>
    prisma.order.findUnique({ where: { id: orderId }, select: { tags: true } })
  );
  if (!order || order.tags.includes(tag)) return;
  await withDbRetry(() =>
    prisma.order.update({ where: { id: orderId }, data: { tags: { set: [...order.tags, tag] } } })
  );
  revalidatePath(`/admin/orders/${orderId}`);
}

/** Remove a tag from an order. */
export async function removeOrderTag(orderId: string, tag: string): Promise<void> {
  await ensureAdmin();
  const order = await withDbRetry(() =>
    prisma.order.findUnique({ where: { id: orderId }, select: { tags: true } })
  );
  if (!order) return;
  await withDbRetry(() =>
    prisma.order.update({
      where: { id: orderId },
      data: { tags: { set: order.tags.filter((t) => t !== tag) } },
    })
  );
  revalidatePath(`/admin/orders/${orderId}`);
}

// --- Customers --------------------------------------------------------------

export async function toggleUserDisabled(userId: string): Promise<void> {
  const admin = await requireRole(["ADMIN", "SUPERADMIN"]);
  // Don't let an admin disable their own account.
  if (userId === admin.id) return;

  const user = await withDbRetry(() =>
    prisma.user.findUnique({ where: { id: userId }, select: { disabled: true } })
  );
  if (!user) return;

  const nowDisabled = !user.disabled;
  await withDbRetry(() =>
    prisma.user.update({ where: { id: userId }, data: { disabled: nowDisabled } })
  );

  // Disabling must immediately invalidate the customer's sessions so any active
  // login stops working right away (belt-and-suspenders with the disabled check
  // in getCurrentUser).
  if (nowDisabled) {
    await withDbRetry(() => prisma.session.deleteMany({ where: { userId } }));
  }

  revalidatePath("/admin/customers");
}
