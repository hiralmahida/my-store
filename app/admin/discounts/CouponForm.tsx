// Create/edit form for a coupon. Client component driven by useActionState
// against a server action passed in as a prop (createCoupon or updateCoupon
// bound to an id), matching the ProductForm pattern.

"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { AdminActionState } from "@/app/admin/actions";

const INITIAL: AdminActionState = {};

export interface CouponDefaults {
  code: string;
  description: string;
  type: "PERCENTAGE" | "FIXED";
  value: string;
  minOrder: string;
  usageLimit: string;
  expiresAt: string; // yyyy-MM-dd or ""
  active: boolean;
  automatic: boolean;
}

const EMPTY: CouponDefaults = {
  code: "",
  description: "",
  type: "PERCENTAGE",
  value: "",
  minOrder: "",
  usageLimit: "",
  expiresAt: "",
  active: true,
  automatic: false,
};

export default function CouponForm({
  action,
  defaults = EMPTY,
  submitLabel = "Create coupon",
}: {
  action: (prev: AdminActionState, formData: FormData) => Promise<AdminActionState>;
  defaults?: CouponDefaults;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const [type, setType] = useState(defaults.type);

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      {state.error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Code
            <input
              name="code"
              defaultValue={defaults.code}
              required
              placeholder="SAVE10"
              autoCapitalize="characters"
              className={`${inputClass} uppercase`}
            />
            <span className="mt-1 block text-xs text-slate-400">
              3–32 letters, numbers, - or _. Shown to shoppers.
            </span>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Description <span className="font-normal text-slate-400">(optional)</span>
            <input
              name="description"
              defaultValue={defaults.description}
              placeholder="Launch week promo"
              className={inputClass}
            />
          </label>
        </div>

        <fieldset className="mt-4">
          <legend className="text-sm font-medium text-slate-700">Discount</legend>
          <div className="mt-2 flex gap-3">
            {(["PERCENTAGE", "FIXED"] as const).map((t) => (
              <label
                key={t}
                className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  type === t
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="type"
                  value={t}
                  checked={type === t}
                  onChange={() => setType(t)}
                  className="sr-only"
                />
                {t === "PERCENTAGE" ? "Percentage (%)" : "Fixed amount (QAR)"}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            {type === "PERCENTAGE" ? "Percent off" : "Amount off (QAR)"}
            <input
              name="value"
              type="number"
              step={type === "PERCENTAGE" ? "1" : "0.01"}
              min="0"
              max={type === "PERCENTAGE" ? "100" : undefined}
              defaultValue={defaults.value}
              required
              className={inputClass}
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Minimum order (QAR) <span className="font-normal text-slate-400">(optional)</span>
            <input
              name="minOrder"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaults.minOrder}
              placeholder="No minimum"
              className={inputClass}
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Usage limit <span className="font-normal text-slate-400">(optional)</span>
            <input
              name="usageLimit"
              type="number"
              step="1"
              min="1"
              defaultValue={defaults.usageLimit}
              placeholder="Unlimited"
              className={inputClass}
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Expiry date <span className="font-normal text-slate-400">(optional)</span>
            <input
              name="expiresAt"
              type="date"
              defaultValue={defaults.expiresAt}
              className={inputClass}
            />
          </label>
        </div>

        <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="active"
              defaultChecked={defaults.active}
              className="h-4 w-4 rounded border-slate-300"
            />
            Active — can be used at checkout
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="automatic"
              defaultChecked={defaults.automatic}
              className="h-4 w-4 rounded border-slate-300"
            />
            Automatic — applies without a code (best-qualifying auto coupon wins)
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link
          href="/admin/discounts"
          className="text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
