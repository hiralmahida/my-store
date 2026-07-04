// Discount logic: validating coupon codes and computing the amount off a cart.
//
// A shopper can enter a coupon `code` (stored in the `coupon` cookie by the
// checkout actions), or the storefront can auto-apply the best-qualifying
// `automatic` coupon. All the qualification rules (active, not expired, under
// its usage limit, meets the minimum order) live here so the cart page, the
// checkout page and the order-placing action all agree.

import { cookies } from "next/headers";
import type { Coupon } from "@/app/generated/prisma/client";
import { prisma } from "@/src/lib/prisma";
import { withDbRetry } from "@/src/lib/db";
import { formatQAR } from "@/src/lib/format";

// The cookie holding the shopper's entered coupon code (upper-cased).
export const COUPON_COOKIE = "coupon";

/** Normalise a user-entered code: trimmed and upper-cased for a case-insensitive match. */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function toNumber(value: { toString(): string } | null | undefined): number {
  return value == null ? 0 : Number(value.toString());
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** The QAR amount a coupon takes off a given subtotal (never more than the subtotal). */
export function discountAmount(coupon: Coupon, subtotal: number): number {
  const value = toNumber(coupon.value);
  const raw = coupon.type === "PERCENTAGE" ? (subtotal * value) / 100 : value;
  return round2(Math.min(Math.max(raw, 0), subtotal));
}

/** A human label for a coupon, e.g. "SAVE10 — 10% off" or "WELCOME — QAR 50.00 off". */
export function couponLabel(coupon: Coupon): string {
  const value = toNumber(coupon.value);
  const off = coupon.type === "PERCENTAGE" ? `${value}% off` : `${formatQAR(value)} off`;
  return `${coupon.code} — ${off}`;
}

export interface CouponCheck {
  ok: boolean;
  coupon?: Coupon;
  discount: number;
  error?: string;
}

/**
 * Validate a coupon code against a subtotal. Pure lookup + rule checks — it does
 * NOT consume the coupon (usage is incremented atomically when the order is
 * placed). Returns a friendly error when the code can't be applied.
 */
export async function checkCoupon(codeRaw: string, subtotal: number): Promise<CouponCheck> {
  const code = normalizeCode(codeRaw);
  if (!code) return { ok: false, discount: 0, error: "Enter a coupon code." };

  const coupon = await withDbRetry(() => prisma.coupon.findUnique({ where: { code } }));
  if (!coupon || !coupon.active) {
    return { ok: false, discount: 0, error: "That coupon code isn't valid." };
  }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return { ok: false, discount: 0, error: "That coupon has expired." };
  }
  if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) {
    return { ok: false, discount: 0, error: "That coupon has reached its usage limit." };
  }
  const min = toNumber(coupon.minOrder);
  if (min > 0 && subtotal < min) {
    return {
      ok: false,
      discount: 0,
      error: `Spend at least ${formatQAR(min)} to use this coupon.`,
    };
  }
  return { ok: true, coupon, discount: discountAmount(coupon, subtotal) };
}

/** The best-qualifying automatic coupon for a subtotal, or null. */
async function bestAutomaticCoupon(
  subtotal: number
): Promise<{ coupon: Coupon; discount: number } | null> {
  const now = new Date();
  const coupons = await withDbRetry(() =>
    prisma.coupon.findMany({
      where: {
        active: true,
        automatic: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    })
  );

  let best: { coupon: Coupon; discount: number } | null = null;
  for (const c of coupons) {
    if (c.usageLimit != null && c.usageCount >= c.usageLimit) continue;
    if (subtotal < toNumber(c.minOrder)) continue;
    const discount = discountAmount(c, subtotal);
    if (discount <= 0) continue;
    if (!best || discount > best.discount) best = { coupon: c, discount };
  }
  return best;
}

export interface AppliedDiscount {
  code: string | null; // the coupon code in effect (manual or automatic)
  label: string | null; // display label, e.g. "SAVE10 — 10% off"
  discount: number; // QAR amount off the subtotal
  automatic: boolean; // true when auto-applied (no code entered)
  error: string | null; // set when an entered code is no longer valid
}

export const NO_DISCOUNT: AppliedDiscount = {
  code: null,
  label: null,
  discount: 0,
  automatic: false,
  error: null,
};

/**
 * Resolve the discount for the current shopper against a subtotal: honour an
 * entered coupon (from the cookie) if still valid, otherwise fall back to the
 * best automatic coupon. Read-only — safe to call from Server Components.
 */
export async function resolveDiscount(subtotal: number): Promise<AppliedDiscount> {
  if (subtotal <= 0) return NO_DISCOUNT;

  const store = await cookies();
  const entered = store.get(COUPON_COOKIE)?.value;

  if (entered) {
    const res = await checkCoupon(entered, subtotal);
    if (res.ok && res.coupon) {
      return {
        code: res.coupon.code,
        label: couponLabel(res.coupon),
        discount: res.discount,
        automatic: false,
        error: null,
      };
    }
    // An entered code that no longer qualifies: surface the reason (the UI can
    // prompt the shopper to remove it) and apply no discount.
    return { ...NO_DISCOUNT, code: normalizeCode(entered), error: res.error ?? "Coupon no longer valid." };
  }

  const auto = await bestAutomaticCoupon(subtotal);
  if (auto) {
    return {
      code: auto.coupon.code,
      label: couponLabel(auto.coupon),
      discount: auto.discount,
      automatic: true,
      error: null,
    };
  }
  return NO_DISCOUNT;
}
