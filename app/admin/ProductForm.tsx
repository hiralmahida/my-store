// Reusable admin product editor (create + edit). Client Component using
// useActionState against a server action passed in as a prop.
//
// Beyond the scalar fields it manages two dynamic collections in local state —
// the media gallery (add/remove/reorder) and product variants — and serialises
// each to a hidden JSON input (`imagesJson` / `variantsJson`) that the server
// action parses. Keeping them as JSON avoids brittle indexed FormData parsing.

"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { AdminActionState } from "@/app/admin/actions";

type Option = { id: string; name: string };

type ImageItem = { url: string; alt: string };
type VariantItem = {
  id?: string;
  name: string;
  optionsText: string; // "Color: Black, Storage: 256GB"
  sku: string;
  price: string; // blank = inherit product price
  stock: string;
};

export interface ProductFormDefaults {
  name?: string;
  slug?: string;
  description?: string;
  price?: number | string;
  compareAtPrice?: number | string | null;
  stock?: number | string;
  lowStockThreshold?: number | string;
  status?: string;
  featured?: boolean;
  categoryId?: string;
  brandId?: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  images?: ImageItem[];
  variants?: {
    id?: string;
    name: string;
    options?: Record<string, string>;
    sku?: string | null;
    price?: number | string | null;
    stock?: number | string;
  }[];
}

const INITIAL: AdminActionState = {};

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function optionsToText(options?: Record<string, string>): string {
  if (!options) return "";
  return Object.entries(options)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
}

function parseOptions(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of text.split(",")) {
    const idx = part.indexOf(":");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key && val) out[key] = val;
  }
  return out;
}

function ErrorText({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 text-xs text-rose-600">{msg}</p> : null;
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
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

  const [images, setImages] = useState<ImageItem[]>(
    defaults.images && defaults.images.length > 0 ? defaults.images : []
  );
  const [variants, setVariants] = useState<VariantItem[]>(
    (defaults.variants ?? []).map((v) => ({
      id: v.id,
      name: v.name,
      optionsText: optionsToText(v.options),
      sku: v.sku ?? "",
      price: v.price == null ? "" : String(v.price),
      stock: v.stock == null ? "0" : String(v.stock),
    }))
  );

  // --- Media handlers ---
  const addImage = () => setImages((prev) => [...prev, { url: "", alt: "" }]);
  const updateImage = (i: number, patch: Partial<ImageItem>) =>
    setImages((prev) => prev.map((img, idx) => (idx === i ? { ...img, ...patch } : img)));
  const removeImage = (i: number) => setImages((prev) => prev.filter((_, idx) => idx !== i));
  const moveImage = (i: number, dir: -1 | 1) =>
    setImages((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  // --- Variant handlers ---
  const addVariant = () =>
    setVariants((prev) => [...prev, { name: "", optionsText: "", sku: "", price: "", stock: "0" }]);
  const updateVariant = (i: number, patch: Partial<VariantItem>) =>
    setVariants((prev) => prev.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  const removeVariant = (i: number) =>
    setVariants((prev) => prev.filter((_, idx) => idx !== i));

  // Serialised payloads for the hidden inputs the server action reads.
  const imagesJson = JSON.stringify(
    images.map((i) => ({ url: i.url.trim(), alt: i.alt.trim() })).filter((i) => i.url)
  );
  const variantsJson = JSON.stringify(
    variants
      .filter((v) => v.name.trim())
      .map((v) => ({
        id: v.id,
        name: v.name.trim(),
        options: parseOptions(v.optionsText),
        sku: v.sku.trim() || null,
        price: v.price.trim() === "" ? null : Number(v.price),
        stock: Number(v.stock) || 0,
      }))
  );

  return (
    <form action={formAction} className="max-w-3xl space-y-5">
      {state.error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
      )}

      {/* Hidden serialised collections */}
      <input type="hidden" name="imagesJson" value={imagesJson} />
      <input type="hidden" name="variantsJson" value={variantsJson} />

      <Section title="Details">
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

        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">Description</label>
          <textarea id="description" name="description" rows={4} defaultValue={defaults.description} className={inputClass} />
          <ErrorText msg={fe.description} />
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
      </Section>

      <Section title="Pricing">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="price" className="mb-1 block text-sm font-medium text-slate-700">Price (QAR)</label>
            <input id="price" name="price" type="number" step="0.01" min="0" defaultValue={defaults.price} className={inputClass} />
            <ErrorText msg={fe.price} />
          </div>
          <div>
            <label htmlFor="compareAtPrice" className="mb-1 block text-sm font-medium text-slate-700">
              Compare-at <span className="text-slate-400">(optional)</span>
            </label>
            <input
              id="compareAtPrice"
              name="compareAtPrice"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaults.compareAtPrice ?? ""}
              className={inputClass}
            />
            <ErrorText msg={fe.compareAtPrice} />
          </div>
        </div>
      </Section>

      <Section
        title="Media"
        description="Images shown on the storefront. The first image is the primary thumbnail; reorder with the arrows."
      >
        {images.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">
            No images yet.
          </p>
        )}
        <div className="space-y-3">
          {images.map((img, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-slate-100">
                {img.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img.url} alt={img.alt || "preview"} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">No URL</div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  value={img.url}
                  onChange={(e) => updateImage(i, { url: e.target.value })}
                  placeholder="https://… image URL"
                  className={inputClass}
                />
                <input
                  value={img.alt}
                  onChange={(e) => updateImage(i, { alt: e.target.value })}
                  placeholder="Alt text (accessibility)"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1">
                <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30" aria-label="Move up">▲</button>
                <button type="button" onClick={() => moveImage(i, 1)} disabled={i === images.length - 1} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30" aria-label="Move down">▼</button>
                <button type="button" onClick={() => removeImage(i)} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Remove">✕</button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addImage}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          + Add image
        </button>
        <p className="text-xs text-slate-400">
          Hosted image URLs only — file upload needs a storage provider.
        </p>
      </Section>

      <Section
        title="Variants"
        description="Optional. Different colours/storage etc. with their own SKU, price and stock. Enter options as “Color: Black, Storage: 256GB”."
      >
        {variants.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">
            No variants. The product is sold as a single item.
          </p>
        )}
        <div className="space-y-3">
          {variants.map((v, i) => (
            <div key={v.id ?? `new-${i}`} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Variant {i + 1}</span>
                <button type="button" onClick={() => removeVariant(i)} className="text-xs font-medium text-slate-400 hover:text-rose-600">Remove</button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <input value={v.name} onChange={(e) => updateVariant(i, { name: e.target.value })} placeholder="Label, e.g. Black / 256GB" className={`${inputClass} sm:col-span-3`} />
                <input value={v.optionsText} onChange={(e) => updateVariant(i, { optionsText: e.target.value })} placeholder="Color: Black, Storage: 256GB" className={`${inputClass} sm:col-span-3`} />
                <input value={v.sku} onChange={(e) => updateVariant(i, { sku: e.target.value })} placeholder="SKU" className={inputClass} />
                <input value={v.price} onChange={(e) => updateVariant(i, { price: e.target.value })} type="number" step="0.01" min="0" placeholder="Price (blank = inherit)" className={inputClass} />
                <input value={v.stock} onChange={(e) => updateVariant(i, { stock: e.target.value })} type="number" min="0" placeholder="Stock" className={inputClass} />
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addVariant}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          + Add variant
        </button>
      </Section>

      <Section title="Inventory & status">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="stock" className="mb-1 block text-sm font-medium text-slate-700">Stock</label>
            <input id="stock" name="stock" type="number" min="0" defaultValue={defaults.stock ?? 0} className={inputClass} />
            <ErrorText msg={fe.stock} />
          </div>
          <div>
            <label htmlFor="lowStockThreshold" className="mb-1 block text-sm font-medium text-slate-700">Low-stock at</label>
            <input id="lowStockThreshold" name="lowStockThreshold" type="number" min="0" defaultValue={defaults.lowStockThreshold ?? 5} className={inputClass} />
            <ErrorText msg={fe.lowStockThreshold} />
          </div>
          <div>
            <label htmlFor="status" className="mb-1 block text-sm font-medium text-slate-700">Status</label>
            <select id="status" name="status" defaultValue={defaults.status ?? "ACTIVE"} className={inputClass}>
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="featured" defaultChecked={defaults.featured} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
          Featured on homepage
        </label>
      </Section>

      <Section title="SEO" description="Optional overrides for the storefront page title and meta description.">
        <div>
          <label htmlFor="seoTitle" className="mb-1 block text-sm font-medium text-slate-700">SEO title</label>
          <input id="seoTitle" name="seoTitle" defaultValue={defaults.seoTitle ?? ""} className={inputClass} />
        </div>
        <div>
          <label htmlFor="seoDescription" className="mb-1 block text-sm font-medium text-slate-700">SEO description</label>
          <textarea id="seoDescription" name="seoDescription" rows={2} defaultValue={defaults.seoDescription ?? ""} className={inputClass} />
        </div>
      </Section>

      <div className="flex items-center gap-3 pt-1">
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
