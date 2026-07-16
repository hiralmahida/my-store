// Create/edit form for a category. Client component driven by useActionState
// against a server action passed in as a prop (createCategory or updateCategory
// bound to an id), matching the CouponForm pattern.

"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { AdminActionState } from "@/app/admin/actions";

const INITIAL: AdminActionState = {};

export interface CategoryDefaults {
  name: string;
  slug: string;
  image: string;
  parentId: string;
}

const EMPTY: CategoryDefaults = { name: "", slug: "", image: "", parentId: "" };

export default function CategoryForm({
  action,
  defaults = EMPTY,
  parents,
  submitLabel = "Create category",
}: {
  action: (prev: AdminActionState, formData: FormData) => Promise<AdminActionState>;
  defaults?: CategoryDefaults;
  parents: { id: string; name: string }[];
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL);

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
  const err = (k: string) =>
    state.fieldErrors?.[k] ? (
      <span className="mt-1 block text-xs text-rose-600">{state.fieldErrors[k]}</span>
    ) : null;

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      {state.error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <label className="block text-sm font-medium text-slate-700">
          Name
          <input name="name" defaultValue={defaults.name} required placeholder="Laptops" className={inputClass} />
          {err("name")}
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Slug <span className="font-normal text-slate-400">(optional — derived from the name)</span>
          <input name="slug" defaultValue={defaults.slug} placeholder="laptops" className={inputClass} />
          {err("slug")}
        </label>

        <div>
          <label htmlFor="parentId" className="block text-sm font-medium text-slate-700">
            Parent category <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <select id="parentId" name="parentId" defaultValue={defaults.parentId} className={inputClass}>
            <option value="">— None (top level) —</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {err("parentId")}
        </div>

        <label className="block text-sm font-medium text-slate-700">
          Image URL <span className="font-normal text-slate-400">(optional)</span>
          <input name="image" defaultValue={defaults.image} placeholder="https://…" className={inputClass} />
          {err("image")}
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link href="/admin/categories" className="text-sm font-medium text-slate-500 hover:text-slate-800">
          Cancel
        </Link>
      </div>
    </form>
  );
}
