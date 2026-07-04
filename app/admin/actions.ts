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
}
