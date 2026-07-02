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
import { getPaymentProvider } from "@/src/lib/payments";
import type { PaymentMethod } from "@/app/generated/prisma/client";

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

        // Decrement stock for each purchased item.
        for (const item of cart.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }

        // Empty the cart (cascades its items).
        if (cartId) await tx.cart.delete({ where: { id: cartId } });

        return created;
      },
      { maxWait: 15000, timeout: 20000 }
    )
  );

  revalidatePath("/", "layout"); // header cart badge resets to 0
  redirect(`/checkout/success?order=${order.id}`);
}
