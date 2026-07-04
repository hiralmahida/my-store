// Server Actions for the admin panel. Every action re-checks the admin role
// (defense in depth — never rely only on the page/layout guard).

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/src/lib/prisma";
import { withDbRetry } from "@/src/lib/db";
import { requireRole } from "@/src/lib/auth";
import { publishStockChange, publishOrderStatus } from "@/src/lib/events";
import { hashPassword } from "@/src/lib/password";
import { normalizeCode } from "@/src/lib/discounts";
import { sanitizePermissions } from "@/src/lib/permissions";
import { SETTINGS_ID } from "@/src/lib/settings";
import type { OrderStatus, DiscountType, Role } from "@/app/generated/prisma/client";

export interface AdminActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
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

const PRODUCT_STATUS_VALUES = ["ACTIVE", "DRAFT", "ARCHIVED"] as const;
type ProductStatusValue = (typeof PRODUCT_STATUS_VALUES)[number];

interface ParsedImage {
  url: string;
  alt: string;
}
interface ParsedVariant {
  id?: string;
  name: string;
  options: Record<string, string>;
  sku: string | null;
  price: number | null;
  stock: number;
}

interface ParsedProduct {
  values: {
    name: string;
    slug: string;
    description: string;
    price: number;
    compareAtPrice: number | null;
    stock: number;
    lowStockThreshold: number;
    status: ProductStatusValue;
    featured: boolean;
    categoryId: string;
    brandId: string;
    seoTitle: string | null;
    seoDescription: string | null;
  };
  images: ParsedImage[];
  variants: ParsedVariant[];
  fieldErrors: Record<string, string>;
}

/** Parse the JSON payload the editor submits for images/variants, tolerating
 *  malformed input by falling back to an empty list. */
function parseJsonField<T>(formData: FormData, key: string): T[] {
  try {
    const raw = String(formData.get(key) ?? "");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function parseProductForm(formData: FormData): ParsedProduct {
  const name = String(formData.get("name") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const slug = slugRaw ? slugify(slugRaw) : slugify(name);
  const description = String(formData.get("description") ?? "").trim();
  const price = Number(formData.get("price"));
  const compareAtRaw = String(formData.get("compareAtPrice") ?? "").trim();
  const compareAtPrice = compareAtRaw ? Number(compareAtRaw) : null;
  const stock = Number(formData.get("stock"));
  const lowStockThreshold = Number(formData.get("lowStockThreshold") ?? 5);
  const statusRaw = String(formData.get("status") ?? "ACTIVE");
  const status = (PRODUCT_STATUS_VALUES as readonly string[]).includes(statusRaw)
    ? (statusRaw as ProductStatusValue)
    : "ACTIVE";
  const featured = formData.get("featured") != null;
  const categoryId = String(formData.get("categoryId") ?? "");
  const brandId = String(formData.get("brandId") ?? "");
  const seoTitle = String(formData.get("seoTitle") ?? "").trim() || null;
  const seoDescription = String(formData.get("seoDescription") ?? "").trim() || null;

  const images: ParsedImage[] = parseJsonField<Partial<ParsedImage>>(formData, "imagesJson")
    .map((i) => ({ url: String(i.url ?? "").trim(), alt: String(i.alt ?? "").trim() }))
    .filter((i) => i.url);

  const variants: ParsedVariant[] = parseJsonField<Record<string, unknown>>(formData, "variantsJson")
    .map((v) => {
      const options =
        v.options && typeof v.options === "object" && !Array.isArray(v.options)
          ? (v.options as Record<string, string>)
          : {};
      const priceRaw = v.price == null ? "" : String(v.price).trim();
      const priceNum = priceRaw ? Number(priceRaw) : null;
      return {
        id: v.id ? String(v.id) : undefined,
        name: String(v.name ?? "").trim(),
        options,
        sku: String(v.sku ?? "").trim() || null,
        price: priceNum != null && Number.isFinite(priceNum) && priceNum >= 0 ? priceNum : null,
        stock: Number.isInteger(Number(v.stock)) && Number(v.stock) >= 0 ? Number(v.stock) : 0,
      };
    })
    .filter((v) => v.name);

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Enter a product name.";
  if (!slug) fieldErrors.slug = "Enter a valid slug.";
  if (description.length < 5) fieldErrors.description = "Enter a description.";
  if (!Number.isFinite(price) || price <= 0) fieldErrors.price = "Enter a price greater than 0.";
  if (compareAtPrice != null && (!Number.isFinite(compareAtPrice) || compareAtPrice < 0))
    fieldErrors.compareAtPrice = "Compare-at price must be 0 or more.";
  if (!Number.isInteger(stock) || stock < 0) fieldErrors.stock = "Enter stock (0 or more).";
  if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0)
    fieldErrors.lowStockThreshold = "Threshold must be 0 or more.";
  if (!categoryId) fieldErrors.categoryId = "Choose a category.";
  if (!brandId) fieldErrors.brandId = "Choose a brand.";

  return {
    values: {
      name,
      slug,
      description,
      price,
      compareAtPrice,
      stock,
      lowStockThreshold,
      status,
      featured,
      categoryId,
      brandId,
      seoTitle,
      seoDescription,
    },
    images,
    variants,
    fieldErrors,
  };
}

export async function createProduct(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await ensureAdmin();
  const { values, images, variants, fieldErrors } = parseProductForm(formData);
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
        compareAtPrice: values.compareAtPrice,
        stock: values.stock,
        lowStockThreshold: values.lowStockThreshold,
        status: values.status,
        featured: values.featured,
        categoryId: values.categoryId,
        brandId: values.brandId,
        seoTitle: values.seoTitle,
        seoDescription: values.seoDescription,
        images: {
          create: images.map((img, i) => ({
            url: img.url,
            alt: img.alt || values.name,
            position: i,
          })),
        },
        variants: {
          create: variants.map((v, i) => ({
            name: v.name,
            options: v.options,
            sku: v.sku,
            price: v.price,
            stock: v.stock,
            position: i,
          })),
        },
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
  const admin = await ensureAdmin();
  const { values, images, variants, fieldErrors } = parseProductForm(formData);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const clash = await withDbRetry(() =>
    prisma.product.findUnique({ where: { slug: values.slug }, select: { id: true } })
  );
  if (clash && clash.id !== id) {
    return { fieldErrors: { slug: "Another product already uses this slug." } };
  }

  const before = await withDbRetry(() =>
    prisma.product.findUnique({
      where: { id },
      select: { stock: true, variants: { select: { id: true } } },
    })
  );
  if (!before) return { error: "Product not found." };

  // Reconcile variants without churning ids (their stock history FK-references
  // them): update those still present, create new ones, delete removed ones.
  const existingIds = new Set(before.variants.map((v) => v.id));
  const keptIds = new Set(variants.filter((v) => v.id && existingIds.has(v.id)).map((v) => v.id!));
  const removedIds = [...existingIds].filter((vid) => !keptIds.has(vid));

  await withDbRetry(() =>
    prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          name: values.name,
          slug: values.slug,
          description: values.description,
          price: values.price,
          compareAtPrice: values.compareAtPrice,
          stock: values.stock,
          lowStockThreshold: values.lowStockThreshold,
          status: values.status,
          featured: values.featured,
          categoryId: values.categoryId,
          brandId: values.brandId,
          seoTitle: values.seoTitle,
          seoDescription: values.seoDescription,
          // Images have no dependents — replace the whole gallery in order.
          images: {
            deleteMany: {},
            create: images.map((img, i) => ({
              url: img.url,
              alt: img.alt || values.name,
              position: i,
            })),
          },
        },
      });

      if (removedIds.length > 0) {
        await tx.productVariant.deleteMany({ where: { id: { in: removedIds } } });
      }
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        if (v.id && existingIds.has(v.id)) {
          await tx.productVariant.update({
            where: { id: v.id },
            data: { name: v.name, options: v.options, sku: v.sku, price: v.price, stock: v.stock, position: i },
          });
        } else {
          await tx.productVariant.create({
            data: {
              productId: id,
              name: v.name,
              options: v.options,
              sku: v.sku,
              price: v.price,
              stock: v.stock,
              position: i,
            },
          });
        }
      }

      // Log a stock adjustment when the product-level stock is edited here.
      if (before.stock !== values.stock) {
        await tx.stockAdjustment.create({
          data: {
            productId: id,
            delta: values.stock - before.stock,
            newStock: values.stock,
            reason: "Product edit",
            actor: admin.name,
          },
        });
      }
    })
  );

  // If stock changed, broadcast it so any open product pages update live.
  if (before.stock !== values.stock) {
    publishStockChange(id, values.stock);
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  redirect("/admin/products");
}

export async function deleteProduct(id: string): Promise<void> {
  await ensureAdmin();
  await softOrHardDeleteProduct(id);
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

/** Delete one product: hard-delete if unreferenced, else soft-delete so past
 *  orders still resolve it. Shared by the row action and bulk delete. */
async function softOrHardDeleteProduct(id: string): Promise<void> {
  const orderItems = await withDbRetry(() =>
    prisma.orderItem.count({ where: { productId: id } })
  );
  if (orderItems === 0) {
    await withDbRetry(() => prisma.product.delete({ where: { id } }));
  } else {
    await withDbRetry(() =>
      prisma.product.update({
        where: { id },
        data: { deletedAt: new Date(), stock: 0, featured: false },
      })
    );
    publishStockChange(id, 0);
  }
}

/** Bulk action from the products list: change status, toggle featured, or
 *  delete a set of products at once. */
export async function bulkProductAction(ids: string[], action: string): Promise<void> {
  await ensureAdmin();
  if (ids.length === 0) return;

  switch (action) {
    case "activate":
    case "draft":
    case "archive": {
      const status: ProductStatusValue =
        action === "activate" ? "ACTIVE" : action === "draft" ? "DRAFT" : "ARCHIVED";
      await withDbRetry(() =>
        prisma.product.updateMany({ where: { id: { in: ids } }, data: { status } })
      );
      break;
    }
    case "feature":
    case "unfeature":
      await withDbRetry(() =>
        prisma.product.updateMany({
          where: { id: { in: ids } },
          data: { featured: action === "feature" },
        })
      );
      break;
    case "delete":
      for (const id of ids) await softOrHardDeleteProduct(id);
      break;
    default:
      return;
  }
  revalidatePath("/admin/products");
}

// --- Inventory --------------------------------------------------------------

/** Set a new absolute stock quantity for a product or one of its variants,
 *  recording the signed delta in the stock-change history. */
export async function adjustStock(formData: FormData): Promise<void> {
  const admin = await ensureAdmin();
  const productId = String(formData.get("productId") ?? "");
  const variantId = String(formData.get("variantId") ?? "").trim() || null;
  const newStock = Number(formData.get("stock"));
  const reason = String(formData.get("reason") ?? "").trim() || null;
  if (!productId || !Number.isInteger(newStock) || newStock < 0) return;

  const current = variantId
    ? await withDbRetry(() =>
        prisma.productVariant.findUnique({ where: { id: variantId }, select: { stock: true } })
      )
    : await withDbRetry(() =>
        prisma.product.findUnique({ where: { id: productId }, select: { stock: true } })
      );
  if (!current) return;
  const delta = newStock - current.stock;
  if (delta === 0) return;

  await withDbRetry(() =>
    prisma.$transaction([
      variantId
        ? prisma.productVariant.update({ where: { id: variantId }, data: { stock: newStock } })
        : prisma.product.update({ where: { id: productId }, data: { stock: newStock } }),
      prisma.stockAdjustment.create({
        data: { productId, variantId, delta, newStock, reason, actor: admin.name },
      }),
    ])
  );

  // Product-level stock feeds the storefront — broadcast it live.
  if (!variantId) publishStockChange(productId, newStock);

  revalidatePath("/admin/inventory");
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/products");
}

/** Update a product's low-stock alert threshold from the inventory view. */
export async function setLowStockThreshold(formData: FormData): Promise<void> {
  await ensureAdmin();
  const productId = String(formData.get("productId") ?? "");
  const threshold = Number(formData.get("lowStockThreshold"));
  if (!productId || !Number.isInteger(threshold) || threshold < 0) return;
  await withDbRetry(() =>
    prisma.product.update({ where: { id: productId }, data: { lowStockThreshold: threshold } })
  );
  revalidatePath("/admin/inventory");
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
  revalidatePath(`/admin/customers/${userId}`);
  revalidatePath("/admin/settings");
}

/** Save a customer's internal note (admin-only, shown on the profile). */
export async function updateCustomerNotes(userId: string, formData: FormData): Promise<void> {
  await ensureAdmin();
  const notes = String(formData.get("notes") ?? "").trim();
  await withDbRetry(() =>
    prisma.user.update({ where: { id: userId }, data: { notes: notes || null } })
  );
  revalidatePath(`/admin/customers/${userId}`);
}

/** Add a tag to a customer (deduped, trimmed). */
export async function addCustomerTag(userId: string, formData: FormData): Promise<void> {
  await ensureAdmin();
  const tag = String(formData.get("tag") ?? "").trim();
  if (!tag) return;

  const user = await withDbRetry(() =>
    prisma.user.findUnique({ where: { id: userId }, select: { tags: true } })
  );
  if (!user || user.tags.includes(tag)) return;

  await withDbRetry(() =>
    prisma.user.update({ where: { id: userId }, data: { tags: { push: tag } } })
  );
  revalidatePath(`/admin/customers/${userId}`);
}

/** Remove a tag from a customer. */
export async function removeCustomerTag(userId: string, tag: string): Promise<void> {
  await ensureAdmin();
  const user = await withDbRetry(() =>
    prisma.user.findUnique({ where: { id: userId }, select: { tags: true } })
  );
  if (!user) return;

  await withDbRetry(() =>
    prisma.user.update({
      where: { id: userId },
      data: { tags: { set: user.tags.filter((t) => t !== tag) } },
    })
  );
  revalidatePath(`/admin/customers/${userId}`);
}

// --- Coupons / discounts ----------------------------------------------------

// Parse the shared coupon form fields into validated column values, or return
// an error message. Used by both create and update.
function parseCouponForm(formData: FormData):
  | { ok: true; data: CouponWriteData }
  | { ok: false; error: string } {
  const code = normalizeCode(String(formData.get("code") ?? ""));
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
    return { ok: false, error: "Code must be 3–32 letters, numbers, - or _." };
  }

  const type: DiscountType =
    String(formData.get("type") ?? "PERCENTAGE").toUpperCase() === "FIXED" ? "FIXED" : "PERCENTAGE";

  const value = Number(formData.get("value"));
  if (!Number.isFinite(value) || value <= 0) {
    return { ok: false, error: "Enter a discount value greater than 0." };
  }
  if (type === "PERCENTAGE" && value > 100) {
    return { ok: false, error: "A percentage discount can't exceed 100%." };
  }

  const minOrderRaw = String(formData.get("minOrder") ?? "").trim();
  const minOrder = minOrderRaw ? Number(minOrderRaw) : null;
  if (minOrder != null && (!Number.isFinite(minOrder) || minOrder < 0)) {
    return { ok: false, error: "Minimum order must be a positive amount." };
  }

  const usageLimitRaw = String(formData.get("usageLimit") ?? "").trim();
  const usageLimit = usageLimitRaw ? Math.floor(Number(usageLimitRaw)) : null;
  if (usageLimit != null && (!Number.isFinite(usageLimit) || usageLimit < 1)) {
    return { ok: false, error: "Usage limit must be a whole number of 1 or more." };
  }

  const expiresRaw = String(formData.get("expiresAt") ?? "").trim();
  let expiresAt: Date | null = null;
  if (expiresRaw) {
    const d = new Date(expiresRaw);
    if (Number.isNaN(d.getTime())) return { ok: false, error: "Enter a valid expiry date." };
    expiresAt = d;
  }

  return {
    ok: true,
    data: {
      code,
      description: String(formData.get("description") ?? "").trim() || null,
      type,
      value,
      minOrder,
      usageLimit,
      expiresAt,
      active: formData.get("active") != null,
      automatic: formData.get("automatic") != null,
    },
  };
}

interface CouponWriteData {
  code: string;
  description: string | null;
  type: DiscountType;
  value: number;
  minOrder: number | null;
  usageLimit: number | null;
  expiresAt: Date | null;
  active: boolean;
  automatic: boolean;
}

export async function createCoupon(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await ensureAdmin();
  const parsed = parseCouponForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const existing = await withDbRetry(() =>
    prisma.coupon.findUnique({ where: { code: parsed.data.code }, select: { id: true } })
  );
  if (existing) return { error: "A coupon with that code already exists." };

  await withDbRetry(() => prisma.coupon.create({ data: parsed.data }));
  revalidatePath("/admin/discounts");
  redirect("/admin/discounts?flash=coupon-created");
}

export async function updateCoupon(
  id: string,
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await ensureAdmin();
  const parsed = parseCouponForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  // Guard the unique code against collisions with a *different* coupon.
  const clash = await withDbRetry(() =>
    prisma.coupon.findUnique({ where: { code: parsed.data.code }, select: { id: true } })
  );
  if (clash && clash.id !== id) return { error: "Another coupon already uses that code." };

  await withDbRetry(() => prisma.coupon.update({ where: { id }, data: parsed.data }));
  revalidatePath("/admin/discounts");
  redirect("/admin/discounts?flash=coupon-updated");
}

export async function toggleCouponActive(id: string): Promise<void> {
  await ensureAdmin();
  const coupon = await withDbRetry(() =>
    prisma.coupon.findUnique({ where: { id }, select: { active: true } })
  );
  if (!coupon) return;
  await withDbRetry(() =>
    prisma.coupon.update({ where: { id }, data: { active: !coupon.active } })
  );
  revalidatePath("/admin/discounts");
}

export async function deleteCoupon(id: string): Promise<void> {
  await ensureAdmin();
  // Past orders reference the coupon (couponId + snapshotted code). Detach them
  // first so history is preserved, then delete the coupon.
  await withDbRetry(() =>
    prisma.$transaction([
      prisma.order.updateMany({ where: { couponId: id }, data: { couponId: null } }),
      prisma.coupon.delete({ where: { id } }),
    ])
  );
  revalidatePath("/admin/discounts");
  redirect("/admin/discounts?flash=coupon-deleted");
}

// --- Store settings ---------------------------------------------------------

export async function updateStoreSettings(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  // Store details + staff are superadmin-only.
  await requireRole(["SUPERADMIN"]);

  const data = {
    storeName: String(formData.get("storeName") ?? "").trim() || "FirstStop",
    contactEmail: String(formData.get("contactEmail") ?? "").trim(),
    contactPhone: String(formData.get("contactPhone") ?? "").trim(),
    deliveryInfo: String(formData.get("deliveryInfo") ?? "").trim(),
    promoText: String(formData.get("promoText") ?? "").trim(),
    promoActive: formData.get("promoActive") != null,
  };

  await withDbRetry(() =>
    prisma.storeSetting.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...data },
      update: data,
    })
  );

  revalidatePath("/admin/settings");
  revalidatePath("/", "layout"); // promo banner is rendered in the root layout
  return { success: "Store settings saved." };
}

// --- Staff ------------------------------------------------------------------

export async function createStaff(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireRole(["SUPERADMIN"]);

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role: Role =
    String(formData.get("role") ?? "ADMIN").toUpperCase() === "SUPERADMIN" ? "SUPERADMIN" : "ADMIN";
  const permissions = sanitizePermissions(formData.getAll("permissions").map(String));

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Enter a name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = "Enter a valid email.";
  if (password.length < 8) fieldErrors.password = "Password must be at least 8 characters.";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const existing = await withDbRetry(() =>
    prisma.user.findUnique({ where: { email }, select: { id: true } })
  );
  if (existing) return { fieldErrors: { email: "An account with this email already exists." } };

  const passwordHash = await hashPassword(password);
  await withDbRetry(() =>
    prisma.user.create({
      // Superadmins implicitly have all sections, so we don't store per-section
      // permissions for them.
      data: { name, email, passwordHash, role, permissions: role === "SUPERADMIN" ? [] : permissions },
    })
  );

  revalidatePath("/admin/settings");
  redirect("/admin/settings?flash=staff-created");
}

/** Update a staff member's role and section permissions. */
export async function updateStaffAccess(staffId: string, formData: FormData): Promise<void> {
  const admin = await requireRole(["SUPERADMIN"]);

  const role: Role =
    String(formData.get("role") ?? "ADMIN").toUpperCase() === "SUPERADMIN" ? "SUPERADMIN" : "ADMIN";
  const permissions = sanitizePermissions(formData.getAll("permissions").map(String));

  // Guard: never let a superadmin demote themselves (avoids locking the store
  // out of staff management).
  const nextRole = staffId === admin.id ? "SUPERADMIN" : role;

  await withDbRetry(() =>
    prisma.user.update({
      where: { id: staffId },
      data: { role: nextRole, permissions: nextRole === "SUPERADMIN" ? [] : permissions },
    })
  );

  // Role + permissions are read live from the DB on every request (see
  // getCurrentUser), so the change takes effect immediately — no need to force
  // a re-login.
  revalidatePath("/admin/settings");
}
