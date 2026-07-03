"use client";

import { useActionState } from "react";
import { submitContact, type ContactState } from "@/app/contact/actions";

const INITIAL: ContactState = {};

export default function ContactForm() {
  const [state, formAction, pending] = useActionState(submitContact, INITIAL);

  if (state.success) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-sm text-green-800">
        <p className="font-semibold">Thanks for reaching out! ✅</p>
        <p className="mt-1">
          We&apos;ve received your message and our Doha team will get back to you within one
          business day.
        </p>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
  const err = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">Name</label>
        <input id="name" name="name" className={inputClass} />
        {err.name && <p className="mt-1 text-xs text-rose-600">{err.name}</p>}
      </div>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">Email</label>
        <input id="email" name="email" type="email" className={inputClass} />
        {err.email && <p className="mt-1 text-xs text-rose-600">{err.email}</p>}
      </div>
      <div>
        <label htmlFor="message" className="mb-1 block text-sm font-medium text-slate-700">Message</label>
        <textarea id="message" name="message" rows={5} className={inputClass} />
        {err.message && <p className="mt-1 text-xs text-rose-600">{err.message}</p>}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70"
      >
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
