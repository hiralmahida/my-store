// Payment providers behind a small, swappable interface.
//
// The storefront never talks to a payment SDK directly — it calls a
// PaymentProvider. For this demo the providers are SIMULATED so the app runs
// with no API keys: a test-card processor (mimicking Stripe test mode) and a
// BNPL/installment stub (mimicking Tabby/Tamara). To go live, implement this
// same interface with a real provider and swap it into `getPaymentProvider`.
//
// Security note: we never persist raw card details. Card data is used only to
// simulate approval here and is discarded.

import { randomBytes } from "node:crypto";
import type { PaymentMethod } from "@/app/generated/prisma/client";

export interface CardDetails {
  number: string;
  expiry: string; // "MM/YY"
  cvc: string;
  name: string;
}

export interface PaymentRequest {
  amount: number; // QAR
  currency: string; // "QAR"
  orderRef: string; // our reference for the attempt
  card?: CardDetails; // present for CARD payments
}

export interface InstallmentPlan {
  count: number;
  each: number; // QAR per installment
}

export interface PaymentResult {
  success: boolean;
  provider: string; // provider id stored on the Payment row
  reference: string; // provider transaction reference
  error?: string; // present when success === false
  installmentPlan?: InstallmentPlan; // present for BNPL
}

export interface PaymentProvider {
  readonly id: string;
  charge(request: PaymentRequest): Promise<PaymentResult>;
}

// A random provider-style transaction reference, e.g. "MOCK-CARD-9F3A1C…".
function makeReference(prefix: string): string {
  return `${prefix}-${randomBytes(6).toString("hex").toUpperCase()}`;
}

// Test cards (Stripe-style): this one is always declined. Any other otherwise
// valid-looking number is approved.
export const DECLINE_TEST_CARD = "4000000000000002";
export const APPROVE_TEST_CARD = "4242424242424242";

function normalizeCardNumber(raw: string): string {
  return raw.replace(/[\s-]/g, "");
}

/** Simulated card processor. Approves test cards, declines the decline card. */
const mockCardProvider: PaymentProvider = {
  id: "mock-card",
  async charge(request) {
    const card = request.card;
    if (!card) {
      return { success: false, provider: this.id, reference: "", error: "Card details are required." };
    }

    const number = normalizeCardNumber(card.number);
    if (!/^\d{13,19}$/.test(number)) {
      return { success: false, provider: this.id, reference: "", error: "Enter a valid card number." };
    }
    if (!/^\d{2}\/\d{2}$/.test(card.expiry.trim())) {
      return { success: false, provider: this.id, reference: "", error: "Enter expiry as MM/YY." };
    }
    if (!/^\d{3,4}$/.test(card.cvc.trim())) {
      return { success: false, provider: this.id, reference: "", error: "Enter a valid CVC." };
    }

    // Simulate the processor's decision.
    if (number === DECLINE_TEST_CARD) {
      return { success: false, provider: this.id, reference: "", error: "Your card was declined. Try a different card." };
    }

    return { success: true, provider: this.id, reference: makeReference("MOCK-CARD") };
  },
};

/** Simulated BNPL provider: splits the total into 4 interest-free payments. */
const mockBnplProvider: PaymentProvider = {
  id: "mock-bnpl",
  async charge(request) {
    const count = 4;
    const each = Math.round((request.amount / count) * 100) / 100;
    return {
      success: true,
      provider: this.id,
      reference: makeReference("BNPL"),
      installmentPlan: { count, each },
    };
  },
};

/** Return the provider that handles a given payment method. */
export function getPaymentProvider(method: PaymentMethod): PaymentProvider {
  return method === "BNPL" ? mockBnplProvider : mockCardProvider;
}
