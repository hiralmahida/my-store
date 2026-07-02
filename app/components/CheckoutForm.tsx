// Checkout form (client): shipping details, delivery, and payment method.
//
// Uses useActionState to call the placeOrder server action and show validation/
// payment errors inline. The payment-method radios toggle the card fields vs.
// the BNPL installment preview. On success the action redirects server-side.

"use client";

import { useActionState, useState } from "react";
import { placeOrder, type CheckoutState } from "@/app/checkout/actions";
import { APPROVE_TEST_CARD, DECLINE_TEST_CARD } from "@/src/lib/payments";
import { formatQAR } from "@/src/lib/format";

const INITIAL: CheckoutState = {};

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  autoComplete,
  placeholder,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  autoComplete?: string;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 ${
          error
            ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
            : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
        }`}
      />
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

export default function CheckoutForm({
  defaultName = "",
  defaultEmail = "",
  total,
  installment,
}: {
  defaultName?: string;
  defaultEmail?: string;
  total: number;
  installment: number;
}) {
  const [state, formAction, pending] = useActionState(placeOrder, INITIAL);
  const [method, setMethod] = useState<"CARD" | "BNPL">("CARD");
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-8">
      {state.error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
          {state.error}
        </p>
      )}

      {/* Shipping details */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Shipping details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" name="name" defaultValue={defaultName} autoComplete="name" error={fieldErrors.name} />
          <Field label="Email" name="email" type="email" defaultValue={defaultEmail} autoComplete="email" error={fieldErrors.email} />
          <Field label="Phone" name="phone" type="tel" autoComplete="tel" placeholder="+974 …" error={fieldErrors.phone} />
          <Field label="City" name="city" defaultValue="Doha" autoComplete="address-level2" error={fieldErrors.city} />
          <div className="sm:col-span-2">
            <Field label="Address" name="address" autoComplete="street-address" placeholder="Building, street, area" error={fieldErrors.address} />
          </div>
        </div>
      </section>

      {/* Delivery */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Delivery</h2>
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-sm">
            <p className="font-medium text-slate-900">Free local delivery</p>
            <p className="text-slate-500">Across Qatar, 2–4 business days</p>
          </div>
          <span className="text-sm font-semibold text-green-600">Free</span>
        </div>
      </section>

      {/* Payment */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Payment</h2>

        <div className="space-y-3">
          {/* Card option */}
          <label className={`block rounded-lg border p-4 transition ${method === "CARD" ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200"}`}>
            <span className="flex items-center gap-2">
              <input
                type="radio"
                name="method"
                value="CARD"
                checked={method === "CARD"}
                onChange={() => setMethod("CARD")}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-900">Credit / Debit card</span>
            </span>

            {method === "CARD" && (
              <div className="mt-4 space-y-4">
                <Field label="Name on card" name="cardName" defaultValue={defaultName} autoComplete="cc-name" error={fieldErrors.cardName} />
                <Field label="Card number" name="cardNumber" autoComplete="cc-number" placeholder="4242 4242 4242 4242" error={fieldErrors.cardNumber} />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Expiry (MM/YY)" name="cardExpiry" autoComplete="cc-exp" placeholder="12/28" error={fieldErrors.cardExpiry} />
                  <Field label="CVC" name="cardCvc" autoComplete="cc-csc" placeholder="123" error={fieldErrors.cardCvc} />
                </div>
                <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  Test mode — use <span className="font-mono font-medium text-slate-700">{APPROVE_TEST_CARD}</span> to approve
                  or <span className="font-mono font-medium text-slate-700">{DECLINE_TEST_CARD}</span> to simulate a decline.
                  Any future expiry and 3-digit CVC work.
                </p>
              </div>
            )}
          </label>

          {/* BNPL option */}
          <label className={`block rounded-lg border p-4 transition ${method === "BNPL" ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200"}`}>
            <span className="flex items-center gap-2">
              <input
                type="radio"
                name="method"
                value="BNPL"
                checked={method === "BNPL"}
                onChange={() => setMethod("BNPL")}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-900">Pay in 4 (interest-free)</span>
            </span>

            {method === "BNPL" && (
              <div className="mt-4 rounded-md bg-slate-50 px-3 py-3 text-sm text-slate-600">
                <p>
                  4 interest-free payments of{" "}
                  <span className="font-semibold text-slate-900">{formatQAR(installment)}</span>.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  The first payment is taken today; the rest are billed every 2 weeks.
                  (Simulated provider — no real charge.)
                </p>
              </div>
            )}
          </label>
        </div>
      </section>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70"
      >
        {pending ? "Placing order…" : `Pay ${formatQAR(total)}`}
      </button>
    </form>
  );
}
