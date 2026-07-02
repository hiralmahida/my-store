// Reusable admin product form (create + edit). Client Component using
// useActionState against a server action passed in as a prop.

"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { AdminActionState } from "@/app/admin/actions";

type Option = { id: string; name: string };

export interface ProductFormDefaults {
  name?: string;
  slug?: string;
  description?: string;
  price?: number | string;
  stock?: number | string;
  featured?: boolean;
  categoryId?: string;
  brandId?: string;
  imageUrl?: string;
}

const INITIAL: AdminActionState = {};

function ErrorText({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 text-xs text-rose-600">{msg}</p> : null;
}

export default function ProductForm({
  action,
  categories,
  brands,
  defaults = {},
  submitLabel,
}: {
  action: (prev: AdminActionState, formData: FormData) => Promise<AdminActionState>;
  categories: Option[];
  brands: Option[];
  defaults?: ProductFormDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const fe = state.fieldErrors ?? {};
  const inputClass =
    "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      {state.error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
      )}

      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">Name</label>
        <input id="name" name="name" defaultValue={defaults.name} className={inputClass} />
        <ErrorText msg={fe.name} />
      </div>

      <div>
        <label htmlFor="slug" className="mb-1 block text-sm font-medium text-slate-700">
          Slug <span className="text-slate-400">(URL; leave blank to auto-generate)</span>
        </label>
        <input id="slug" name="slug" defaultValue={defaults.slug} placeholder="apple-iphone-15" className={inputClass} />
        <ErrorText msg={fe.slug} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="price" className="mb-1 block text-sm font-medium text-slate-700">Price (QAR)</label>
          <input id="price" name="price" type="number" step="0.01" min="0" defaultValue={defaults.price} className={inputClass} />
          <ErrorText msg={fe.price} />
        </div>
        <div>
          <label htmlFor="stock" className="mb-1 block text-sm font-medium text-slate-700">Stock</label>
          <input id="stock" name="stock" type="number" min="0" defaultValue={defaults.stock} className={inputClass} />
          <ErrorText msg={fe.stock} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="categoryId" className="mb-1 block text-sm font-medium text-slate-700">Category</label>
          <select id="categoryId" name="categoryId" defaultValue={defaults.categoryId ?? ""} className={inputClass}>
            <option value="" disabled>Choose…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <ErrorText msg={fe.categoryId} />
        </div>
        <div>
          <label htmlFor="brandId" className="mb-1 block text-sm font-medium text-slate-700">Brand</label>
          <select id="brandId" name="brandId" defaultValue={defaults.brandId ?? ""} className={inputClass}>
            <option value="" disabled>Choose…</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <ErrorText msg={fe.brandId} />
        </div>
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">Description</label>
        <textarea id="description" name="description" rows={4} defaultValue={defaults.description} className={inputClass} />
        <ErrorText msg={fe.description} />
      </div>

      <div>
        <label htmlFor="imageUrl" className="mb-1 block text-sm font-medium text-slate-700">
          Image URL <span className="text-slate-400">(hosted image; file upload needs a storage provider)</span>
        </label>
        <input id="imageUrl" name="imageUrl" defaultValue={defaults.imageUrl} placeholder="https://…" className={inputClass} />
        <ErrorText msg={fe.imageUrl} />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="featured" defaultChecked={defaults.featured} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
        Featured on homepage
      </label>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link href="/admin/products" className="text-sm font-medium text-slate-500 hover:text-slate-900">
          Cancel
        </Link>
      </div>
    </form>
  );
}
