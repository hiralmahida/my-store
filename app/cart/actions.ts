// Server Actions for cart & wishlist mutations.
//
// Everything here runs on the server ("use server"). These are the ONLY places
// that write the session cookie or change cart/wishlist rows — reads live in
// src/lib/cart.ts. Actions take plain arguments (bound in the calling markup,
// e.g. `removeFromCart.bind(null, productId)`), so there's no FormData parsing.
//
// A cart belongs to a signed-in user (by userId) or a guest (by cookie token);
// helpers below resolve the right one so add/update/remove work in both cases.

"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/src/lib/prisma";
import { withDbRetry } from "@/src/lib/db";
import { CART_SESSION_COOKIE, readSessionToken } from "@/src/lib/cart";
import { getCurrentUser } from "@/src/lib/auth";

// One year, in seconds — how long a guest's cart/wishlist cookie survives.
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// Refresh the pages whose UI depends on cart/wishlist state, including the
// header badges (which live in the root layout).
function revalidateCartUI() {
  revalidatePath("/", "layout"); // header badges
  revalidatePath("/cart");
  revalidatePath("/wishlist");
}

/**
 * Return the guest's session token, creating and setting the cookie on first
 * use. Only callable from a Server Action / Route Handler (it writes a cookie).
 */
async function getOrCreateSessionToken(): Promise<string> {
  const existing = await readSessionToken();
  if (existing) return existing;

  const token = crypto.randomUUID();
  const store = await cookies();
  store.set(CART_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
  });
  return token;
}

/**
 * Get the current actor's cart id, creating the cart if needed. Signed-in users
 * get a user cart (by userId); guests get a cookie-backed cart.
 */
async function getOrCreateCartId(): Promise<string> {
  const user = await getCurrentUser();
  if (user) {
    const cart = await withDbRetry(() =>
      prisma.cart.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {},
        select: { id: true },
      })
    );
    return cart.id;
  }

  const token = await getOrCreateSessionToken();
  const cart = await withDbRetry(() =>
    prisma.cart.upsert({
      where: { sessionToken: token },
      create: { sessionToken: token },
      update: {},
      select: { id: true },
    })
  );
  return cart.id;
}

/** Resolve the current cart id WITHOUT creating one — for mutating existing lines. */
async function findCartId(): Promise<string | null> {
  const user = await getCurrentUser();
  const where = user
    ? { userId: user.id }
    : await readSessionToken().then((t) => (t ? { sessionToken: t } : null));
  if (!where) return null;

  const cart = await withDbRetry(() =>
    prisma.cart.findUnique({ where, select: { id: true } })
  );
  return cart?.id ?? null;
}

// --- Cart -------------------------------------------------------------------

/**
 * Add a product to the cart (or increment it if already present), clamped to
 * available stock. Adding an out-of-stock product is a no-op.
 */
export async function addToCart(productId: string, quantity = 1): Promise<void> {
  const qty = Math.max(1, Math.floor(quantity));

  const product = await withDbRetry(() =>
    prisma.product.findUnique({ where: { id: productId }, select: { stock: true } })
  );
  if (!product || product.stock <= 0) return; // nothing to add

  const cartId = await getOrCreateCartId();

  // How many are already in the cart, so we don't exceed stock.
  const existing = await withDbRetry(() =>
    prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId, productId } },
      select: { quantity: true },
    })
  );
  const nextQty = Math.min((existing?.quantity ?? 0) + qty, product.stock);

  await withDbRetry(() =>
    prisma.cartItem.upsert({
      where: { cartId_productId: { cartId, productId } },
      create: { cartId, productId, quantity: nextQty },
      update: { quantity: nextQty },
    })
  );

  revalidateCartUI();
}

/**
 * Set an exact quantity for a cart line. A quantity of 0 (or less) removes the
 * line; otherwise it's clamped to available stock.
 */
export async function setCartItemQuantity(
  productId: string,
  quantity: number
): Promise<void> {
  const cartId = await findCartId();
  if (!cartId) return;

  if (quantity <= 0) {
    await removeFromCart(productId);
    return;
  }

  const product = await withDbRetry(() =>
    prisma.product.findUnique({ where: { id: productId }, select: { stock: true } })
  );
  if (!product) return;

  const clamped = Math.min(Math.floor(quantity), Math.max(product.stock, 1));

  await withDbRetry(() =>
    prisma.cartItem.updateMany({
      where: { cartId, productId },
      data: { quantity: clamped },
    })
  );

  revalidateCartUI();
}

/** Remove a product from the cart entirely. */
export async function removeFromCart(productId: string): Promise<void> {
  const cartId = await findCartId();
  if (!cartId) return;

  await withDbRetry(() =>
    prisma.cartItem.deleteMany({ where: { cartId, productId } })
  );

  revalidateCartUI();
}

// --- Wishlist ---------------------------------------------------------------
//
// The wishlist stays keyed by the guest cookie token (browser-scoped) even when
// signed in — a deliberate, documented simplification for this phase.

/** Add a product to the wishlist, or remove it if it's already there. */
export async function toggleWishlist(productId: string): Promise<void> {
  const token = await getOrCreateSessionToken();

  const existing = await withDbRetry(() =>
    prisma.wishlistItem.findUnique({
      where: { sessionToken_productId: { sessionToken: token, productId } },
      select: { id: true },
    })
  );

  if (existing) {
    await withDbRetry(() => prisma.wishlistItem.delete({ where: { id: existing.id } }));
  } else {
    await withDbRetry(() =>
      prisma.wishlistItem.create({ data: { sessionToken: token, productId } })
    );
  }

  revalidateCartUI();
}
