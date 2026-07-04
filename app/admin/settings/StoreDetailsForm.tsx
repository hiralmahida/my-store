// Store details + promo banner form (Settings). Client component driven by
// useActionState against updateStoreSettings.

"use client";

import { useActionState } from "react";
import { updateStoreSettings, type AdminActionState } from "@/app/admin/actions";

const INITIAL: AdminActionState = {};

export interface StoreDetailsValues {
  storeName: string;
  contactEmail: string;
  contactPhone: string;
  deliveryInfo: string;
  promoText: string;
  promoActive: boolean;
}

export default function StoreDetailsForm({ values }: { values: StoreDetailsValues }) {
  const [state, formAction, pending] = useActionState(updateStoreSettings, INITIAL);

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {state.success}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900">Store details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Store name
            <input name="storeName" defaultValue={values.storeName} className={inputClass} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Contact email
            <input
              name="contactEmail"
              type="email"
              defaultValue={values.contactEmail}
              placeholder="support@firststop.qa"
              className={inputClass}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Contact phone
            <input
              name="contactPhone"
              defaultValue={values.contactPhone}
              placeholder="+974 …"
              className={inputClass}
            />
          </label>
        </div>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Delivery info
          <textarea
            name="deliveryInfo"
            rows={3}
            defaultValue={values.deliveryInfo}
            placeholder="Free delivery across Qatar within 2–3 days."
            className={`${inputClass} resize-y`}
          />
        </label>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900">Promo banner</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Shows a bar at the top of the storefront when enabled.
        </p>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Banner text
          <input
            name="promoText"
            defaultValue={values.promoText}
            placeholder="Free delivery on all orders this week!"
            className={inputClass}
          />
        </label>
        <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="promoActive"
            defaultChecked={values.promoActive}
            className="h-4 w-4 rounded border-slate-300"
          />
          Show the promo banner on the storefront
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
