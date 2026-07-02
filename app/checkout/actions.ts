// Server Action for placing an order.
//
// Flow: validate the shipping form → re-check stock → charge via the payment
// provider → on success, atomically create the Order + items + Payment,
// decrement stock, and clear the cart → redirect to the confirmation page.
// If payment fails or stock ran out, no order is created and an error returns.

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/src/lib/prisma";
import { withDbRetry } from "@/src/lib/db";
import { getCart, getActiveCartId } from "@/src/lib/cart";
import { getCurrentUser } from "@/src/lib/auth";
import { formatQAR } from "@/src/lib/format";
import { getPaymentProvider } from "@/src/lib/payments";
import {
  publishStockChange,
  publishOrderStatus,
  publishAdminNotification,
} from "@/src/lib/events";
import type { PaymentMethod } from "@/app/generated/prisma/client";

// Products at or below this level trigger a low-stock admin notification.
const LOW_STOCK_THRESHOLD = 5;

export interface CheckoutState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function placeOrder(
  _prev: CheckoutState,
  formData: FormData
): Promise<CheckoutState> {
  const cart = await getCart();
  if (cart.items.length === 0) {
    return { error: "Your cart is empty." };
  }

  // --- Parse + validate the shipping form ---
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const method: PaymentMethod =
    String(formData.get("method") ?? "CARD").toUpperCase() === "BNPL" ? "BNPL" : "CARD";

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = "Enter a valid email.";
  if (phone.length < 6) fieldErrors.phone = "Enter a phone number.";
  if (address.length < 5) fieldErrors.address = "Enter your delivery address.";
  if (city.length < 2) fieldErrors.city = "Enter your city.";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  // --- Re-check stock (guards against changes since the cart was loaded) ---
  for (const item of cart.items) {
    if (item.quantity > item.product.stock) {
      return {
        error: `Sorry, "${item.product.name}" only has ${item.product.stock} left. Please adjust your cart.`,
      };
    }
  }

  // --- Charge via the payment provider ---
  const provider = getPaymentProvider(method);
  const card =
    method === "CARD"
      ? {
          number: String(formData.get("cardNumber") ?? ""),
          expiry: String(formData.get("cardExpiry") ?? ""),
          cvc: String(formData.get("cardCvc") ?? ""),
          name: String(formData.get("cardName") ?? name),
        }
      : undefined;

  const payment = await provider.charge({
    amount: cart.total,
    currency: "QAR",
    orderRef: `ORD-${Date.now()}`,
    card,
  });
  if (!payment.success) {
    return { error: payment.error ?? "Payment failed. Please try again." };
  }

  // --- Persist the order atomically ---
  const user = await getCurrentUser();
  const cartId = await getActiveCartId();
  const shippingAddress = `${address}, ${city}, Qatar`;

  const order = await withDbRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const created = await tx.order.create({
          data: {
            userId: user?.id ?? null,
            customerName: name,
            customerEmail: email,
            customerPhone: phone,
            shippingAddress,
            status: "PAID",
            total: cart.total,
          },
          select: { id: true },
        });

        await tx.orderItem.createMany({
          data: cart.items.map((item) => ({
            orderId: created.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.product.price, // snapshot the price at purchase
          })),
        });

        await tx.payment.create({
          data: {
            orderId: created.id,
            method,
            provider: payment.provider,
            reference: payment.reference,
            amount: cart.total,
            status: "SUCCEEDED",
          },
        });

        // Decrement stock for each purchased item, capturing the new levels so
        // we can broadcast them after the transaction commits.
        const stockUpdates: { productId: string; stock: number; name: string }[] = [];
        for (const item of cart.items) {
          const updated = await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
            select: { id: true, stock: true, name: true },
          });
          stockUpdates.push({ productId: updated.id, stock: updated.stock, name: updated.name });
        }

        // Empty the cart (cascades its items).
        if (cartId) await tx.cart.delete({ where: { id: cartId } });

        return { id: created.id, stockUpdates };
      },
      { maxWait: 15000, timeout: 20000 }
    )
  );

  // Broadcast real-time updates over the event bus (best-effort — a publish
  // failure must never fail an already-committed order).
  try {
    const now = new Date().toISOString();
    for (const u of order.stockUpdates) {
      publishStockChange(u.productId, u.stock);
      if (u.stock <= LOW_STOCK_THRESHOLD) {
        publishAdminNotification({
          kind: "low-stock",
          message: `Low stock: ${u.name} (${u.stock} left)`,
          at: now,
          meta: { productId: u.productId, stock: u.stock },
        });
      }
    }
    publishOrderStatus(order.id, "PAID");
    publishAdminNotification({
      kind: "new-order",
      message: `New order #${order.id.slice(-8).toUpperCase()} — ${formatQAR(cart.total)}`,
      at: now,
      meta: { orderId: order.id, total: cart.total },
    });
  } catch {
    // Real-time is non-critical; ignore failures.
  }

  revalidatePath("/", "layout"); // header cart badge resets to 0
  redirect(`/checkout/success?order=${order.id}`);
}
