// Client forms for the admin's own profile: details (name/email) and a password
// change. Both use useActionState against the profile server actions, matching
// the CouponForm/StaffManager patterns.

"use client";

import { useActionState } from "react";
import { updateProfile, changePassword } from "./actions";
import type { AdminActionState } from "@/app/admin/actions";

const INITIAL: AdminActionState = {};

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function Banner({ state }: { state: AdminActionState }) {
  if (state.success) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
        {state.success}
      </div>
    );
  }
  if (state.error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
        {state.error}
      </div>
    );
  }
  return null;
}

function fieldError(state: AdminActionState, key: string) {
  const msg = state.fieldErrors?.[key];
  return msg ? <span className="mt-1 block text-xs text-rose-600">{msg}</span> : null;
}

export function ProfileDetailsForm({ name, email }: { name: string; email: string }) {
  const [state, formAction, pending] = useActionState(updateProfile, INITIAL);

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
      <Banner state={state} />
      <label className="block text-sm font-medium text-slate-700">
        Full name
        <input name="name" defaultValue={name} required className={inputClass} />
        {fieldError(state, "name")}
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Email
        <input name="email" type="email" defaultValue={email} required className={inputClass} />
        {fieldError(state, "email")}
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, INITIAL);

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
      <Banner state={state} />
      <label className="block text-sm font-medium text-slate-700">
        Current password
        <input name="currentPassword" type="password" autoComplete="current-password" required className={inputClass} />
        {fieldError(state, "currentPassword")}
      </label>
      <label className="block text-sm font-medium text-slate-700">
        New password
        <input name="newPassword" type="password" autoComplete="new-password" required className={inputClass} />
        {fieldError(state, "newPassword")}
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Confirm new password
        <input name="confirmPassword" type="password" autoComplete="new-password" required className={inputClass} />
        {fieldError(state, "confirmPassword")}
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Updating…" : "Change password"}
      </button>
    </form>
  );
}
