// Coupon entry for the checkout order summary. Client component: applies a code
// via useActionState (applyCoupon) and shows the applied/automatic/error state
// derived from the cart.

"use client";

import { useActionState } from "react";
import { applyCoupon, removeCoupon, type CouponState } from "@/app/checkout/actions";
import { formatQAR } from "@/src/lib/format";

const INITIAL: CouponState = {};

export interface AppliedCouponView {
  code: string | null;
  label: string | null;
  discount: number;
  automatic: boolean;
  error: string | null;
}

export default function CouponBox({ applied }: { applied: AppliedCouponView }) {
  const [state, formAction, pending] = useActionState(applyCoupon, INITIAL);

  // An automatic discount is applied by the store, not entered — show it as a
  // notice with no remove control.
  if (applied.automatic && applied.discount > 0) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
        Automatic discount applied
        {applied.label ? ` — ${applied.label.split(" — ")[1] ?? applied.label}` : ""}.
      </div>
    );
  }

  // A successfully applied entered coupon: show it with a remove button.
  if (applied.code && applied.discount > 0 && !applied.error) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm">
        <span className="font-medium text-green-800">
          {applied.code} · −{formatQAR(applied.discount)}
        </span>
        <form action={removeCoupon}>
          <button type="submit" className="font-medium text-green-700 hover:underline">
            Remove
          </button>
        </form>
      </div>
    );
  }

  // No valid coupon applied — show the entry form. If a stale/invalid code is on
  // the cart, surface its reason and offer to clear it.
  return (
    <div className="space-y-2">
      <form action={formAction} className="flex gap-2">
        <input
          type="text"
          name="code"
          placeholder="Coupon code"
          aria-label="Coupon code"
          autoCapitalize="characters"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
        >
          {pending ? "Applying…" : "Apply"}
        </button>
      </form>

      {state.error && <p className="text-xs text-rose-600">{state.error}</p>}

      {applied.error && applied.code && (
        <p className="flex items-center justify-between text-xs text-rose-600">
          <span>
            {applied.code}: {applied.error}
          </span>
          <form action={removeCoupon}>
            <button type="submit" className="font-medium underline">
              Clear
            </button>
          </form>
        </p>
      )}
    </div>
  );
}
