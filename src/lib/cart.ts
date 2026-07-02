// Read-side data access for the guest cart and wishlist.
//
// There's no auth yet, so a cart/wishlist belongs to an anonymous guest
// identified by a random token in the `cart_session` httpOnly cookie. This file
// only READS that cookie (allowed in Server Components). Minting/setting the
// cookie and all mutations live in the server actions (app/cart/actions.ts),
// because cookies can only be written from a Server Function or Route Handler.

import { cookies } from "next/headers";
import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/src/lib/prisma";
import { withDbRetry } from "@/src/lib/db";
import { getCurrentUser } from "@/src/lib/auth";

// The cookie name that ties a browser to its cart/wishlist rows.
export const CART_SESSION_COOKIE = "cart_session";

// Free local delivery across Qatar (the brief). Kept here so the cart page and
// any future checkout agree on the number.
export const DELIVERY_FEE = 0;

/** Read the guest session token from the cookie, or `null` if not set yet. */
export async function readSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(CART_SESSION_COOKIE)?.value ?? null;
}

// A cart is owned by EITHER a signed-in user OR a guest cookie. Resolve which,
// as a unique-where usable by both `cart.findUnique` and relation filters.
type CartOwner = { userId: string } | { sessionToken: string };

async function currentCartOwner(): Promise<CartOwner | null> {
  const user = await getCurrentUser();
  if (user) return { userId: user.id };
  const token = await readSessionToken();
  return token ? { sessionToken: token } : null;
}

// Convert a Prisma Decimal (or number/string) to a JS number for arithmetic.
function toNumber(value: { toString(): string }): number {
  return Number(value.toString());
}

// Round to whole cents to avoid floating-point drift in money math.
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// The product data a cart/wishlist row needs to render: brand + primary image.
const cartItemInclude = {
  product: { include: { brand: true, images: { take: 1 } } },
} satisfies Prisma.CartItemInclude;

export type CartItemWithProduct = Prisma.CartItemGetPayload<{
  include: typeof cartItemInclude;
}>;

export interface CartSummary {
  items: CartItemWithProduct[];
  itemCount: number; // total quantity across all lines
  subtotal: number; // QAR
  deliveryFee: number; // QAR (0 = free)
  total: number; // QAR
  installment: number; // total split into 4 (BNPL preview)
}

const EMPTY_CART: CartSummary = {
  items: [],
  itemCount: 0,
  subtotal: 0,
  deliveryFee: DELIVERY_FEE,
  total: 0,
  installment: 0,
};

/**
 * Load the current guest's cart with product details and computed totals.
 * Returns an empty cart if there's no session cookie yet or the cart is empty.
 */
export async function getCart(): Promise<CartSummary> {
  const owner = await currentCartOwner();
  if (!owner) return EMPTY_CART;

  const cart = await withDbRetry(() =>
    prisma.cart.findUnique({
      where: owner,
      include: {
        items: {
          include: cartItemInclude,
          orderBy: { createdAt: "asc" },
        },
      },
    })
  );

  if (!cart || cart.items.length === 0) return EMPTY_CART;

  const subtotal = round2(
    cart.items.reduce((sum, item) => sum + toNumber(item.product.price) * item.quantity, 0)
  );
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const total = round2(subtotal + DELIVERY_FEE);

  return {
    items: cart.items,
    itemCount,
    subtotal,
    deliveryFee: DELIVERY_FEE,
    total,
    installment: round2(total / 4),
  };
}

/**
 * Total quantity in the cart — a lightweight query for the header badge that
 * avoids loading every line item.
 */
export async function getCartItemCount(): Promise<number> {
  const owner = await currentCartOwner();
  if (!owner) return 0;

  const result = await withDbRetry(() =>
    prisma.cartItem.aggregate({
      where: { cart: owner },
      _sum: { quantity: true },
    })
  );
  return result._sum.quantity ?? 0;
}

// --- Wishlist ---------------------------------------------------------------

const wishlistInclude = {
  product: { include: { brand: true, images: { take: 1 } } },
} satisfies Prisma.WishlistItemInclude;

export type WishlistEntry = Prisma.WishlistItemGetPayload<{
  include: typeof wishlistInclude;
}>;

/** All wishlisted products for the current guest, newest first. */
export async function getWishlist(): Promise<WishlistEntry[]> {
  const token = await readSessionToken();
  if (!token) return [];

  return withDbRetry(() =>
    prisma.wishlistItem.findMany({
      where: { sessionToken: token },
      include: wishlistInclude,
      orderBy: { createdAt: "desc" },
    })
  );
}

/** Whether a specific product is in the current guest's wishlist. */
export async function isWishlisted(productId: string): Promise<boolean> {
  const token = await readSessionToken();
  if (!token) return false;

  const row = await withDbRetry(() =>
    prisma.wishlistItem.findUnique({
      where: { sessionToken_productId: { sessionToken: token, productId } },
      select: { id: true },
    })
  );
  return row != null;
}

/** Count of wishlisted products — for the header badge. */
export async function getWishlistCount(): Promise<number> {
  const token = await readSessionToken();
  if (!token) return 0;

  return withDbRetry(() =>
    prisma.wishlistItem.count({ where: { sessionToken: token } })
  );
}

// --- Login merge ------------------------------------------------------------

/**
 * On login/registration, fold the guest cart (from the cookie) into the user's
 * cart: quantities are summed and clamped to stock, then the guest cart is
 * removed. Ensures the user always has a cart row even if there was no guest
 * cart. Called from the auth actions.
 */
export async function mergeGuestCartIntoUser(userId: string): Promise<void> {
  const token = await readSessionToken();

  const guest = token
    ? await withDbRetry(() =>
        prisma.cart.findUnique({
          where: { sessionToken: token },
          include: { items: true },
        })
      )
    : null;

  // Make sure the user has a cart row regardless.
  const userCart = await withDbRetry(() =>
    prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      select: { id: true },
    })
  );

  if (!guest) return;

  for (const item of guest.items) {
    const product = await withDbRetry(() =>
      prisma.product.findUnique({ where: { id: item.productId }, select: { stock: true } })
    );
    if (!product || product.stock <= 0) continue;

    const existing = await withDbRetry(() =>
      prisma.cartItem.findUnique({
        where: { cartId_productId: { cartId: userCart.id, productId: item.productId } },
        select: { quantity: true },
      })
    );
    const quantity = Math.min((existing?.quantity ?? 0) + item.quantity, product.stock);

    await withDbRetry(() =>
      prisma.cartItem.upsert({
        where: { cartId_productId: { cartId: userCart.id, productId: item.productId } },
        create: { cartId: userCart.id, productId: item.productId, quantity },
        update: { quantity },
      })
    );
  }

  // Remove the guest cart (cascades its items).
  await withDbRetry(() => prisma.cart.delete({ where: { id: guest.id } }));
}
