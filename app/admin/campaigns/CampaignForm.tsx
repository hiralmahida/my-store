// Create/edit form for an email campaign. Client component driven by
// useActionState against a server action passed in as a prop, matching the
// CouponForm/ProductForm pattern. A hidden `intent` field (set by the clicked
// button) tells the action whether to save a draft, schedule, or send now.

"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CAMPAIGN_AUDIENCES } from "@/src/lib/campaigns";
import type { AdminActionState } from "@/app/admin/actions";

const INITIAL: AdminActionState = {};

export interface CampaignDefaults {
  name: string;
  subject: string;
  audience: string;
  body: string;
  scheduledAt: string; // yyyy-MM-dd or ""
}

const EMPTY: CampaignDefaults = {
  name: "",
  subject: "",
  audience: "all",
  body: "",
  scheduledAt: "",
};

export default function CampaignForm({
  action,
  defaults = EMPTY,
  mode = "create",
}: {
  action: (prev: AdminActionState, formData: FormData) => Promise<AdminActionState>;
  defaults?: CampaignDefaults;
  mode?: "create" | "edit";
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const [audience, setAudience] = useState(defaults.audience);

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
  const fieldErrors = state.fieldErrors ?? {};
  const errText = (k: string) =>
    fieldErrors[k] ? <span className="mt-1 block text-xs text-rose-600">{fieldErrors[k]}</span> : null;

  const selectedAudience = CAMPAIGN_AUDIENCES.find((a) => a.key === audience);

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      {state.error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <label className="block text-sm font-medium text-slate-700">
          Campaign name
          <input name="name" defaultValue={defaults.name} required placeholder="Summer Sale 2026" className={inputClass} />
          {errText("name")}
        </label>

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Email subject
          <input
            name="subject"
            defaultValue={defaults.subject}
            required
            placeholder="Up to 30% off this week only"
            className={inputClass}
          />
          {errText("subject")}
        </label>

        <div className="mt-4">
          <label htmlFor="audience" className="block text-sm font-medium text-slate-700">
            Audience
          </label>
          <select
            id="audience"
            name="audience"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className={inputClass}
          >
            {CAMPAIGN_AUDIENCES.map((a) => (
              <option key={a.key} value={a.key}>
                {a.label} ({a.size.toLocaleString("en-US")})
              </option>
            ))}
          </select>
          {selectedAudience && (
            <span className="mt-1 block text-xs text-slate-400">
              Reaches ~{selectedAudience.size.toLocaleString("en-US")} recipients.
            </span>
          )}
          {errText("audience")}
        </div>

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Message
          <textarea
            name="body"
            defaultValue={defaults.body}
            required
            rows={5}
            placeholder="Write the email body…"
            className={`${inputClass} resize-y`}
          />
          {errText("body")}
        </label>

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Schedule date <span className="font-normal text-slate-400">(optional)</span>
          <input name="scheduledAt" type="date" defaultValue={defaults.scheduledAt} className={inputClass} />
          <span className="mt-1 block text-xs text-slate-400">
            Set a date and choose “Schedule”, or send immediately.
          </span>
          {errText("scheduledAt")}
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          name="intent"
          value="draft"
          disabled={pending}
          className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save draft"}
        </button>
        <button
          type="submit"
          name="intent"
          value="schedule"
          disabled={pending}
          className="rounded-lg border border-blue-200 bg-blue-50 px-5 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
        >
          Schedule
        </button>
        {mode === "create" && (
          <button
            type="submit"
            name="intent"
            value="send"
            disabled={pending}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            Send now
          </button>
        )}
        <Link href="/admin/campaigns" className="text-sm font-medium text-slate-500 hover:text-slate-800">
          Cancel
        </Link>
      </div>
    </form>
  );
}
