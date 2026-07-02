// Server Actions for cart & wishlist mutations.
//
// Everything here runs on the server ("use server"). These are the ONLY places
// that write the session cookie or change cart/wishlist rows — reads live in
// src/lib/cart.ts. Actions take plain arguments (bound in the calling markup,
// e.g. `removeFromCart.bind(null, productId)`), so there's no FormData parsing.

"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/src/lib/prisma";
import { withDbRetry } from "@/src/lib/db";
import { CART_SESSION_COOKIE, readSessionToken } from "@/src/lib/cart";

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

/** Get the guest's cart id, creating the cart row if it doesn't exist yet. */
async function getOrCreateCartId(token: string): Promise<string> {
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

  const token = await getOrCreateSessionToken();
  const cartId = await getOrCreateCartId(token);

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
  const token = await readSessionToken();
  if (!token) return;

  const cart = await withDbRetry(() =>
    prisma.cart.findUnique({ where: { sessionToken: token }, select: { id: true } })
  );
  if (!cart) return;

  if (quantity <= 0) {
    await removeFromCart(productId);
    return;
  }

  const product = await withDbRetry(() =>
    prisma.product.findUnique({ where: { id: productId }, select: { stock: true } })
  );
  if (!product) return;

  const clamped = Math.min(Math.floor(quantity), Math.max(product.stock, 1));

  // Update only if the line exists; ignore otherwise.
  await withDbRetry(() =>
    prisma.cartItem.updateMany({
      where: { cartId: cart.id, productId },
      data: { quantity: clamped },
    })
  );

  revalidateCartUI();
}

/** Remove a product from the cart entirely. */
export async function removeFromCart(productId: string): Promise<void> {
  const token = await readSessionToken();
  if (!token) return;

  await withDbRetry(() =>
    prisma.cartItem.deleteMany({
      where: { productId, cart: { sessionToken: token } },
    })
  );

  revalidateCartUI();
}

// --- Wishlist ---------------------------------------------------------------

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
