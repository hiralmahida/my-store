// Admin products table with row selection + bulk actions. Client component:
// rows arrive as plain serializable data from the server page.

"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import StatusBadge from "@/app/admin/_components/StatusBadge";
import { SortableHeader, Th } from "@/app/admin/_components/DataTable";
import { bulkProductAction, deleteProduct } from "@/app/admin/actions";
import { useToast } from "@/app/components/ToastProvider";
import { formatQAR } from "@/src/lib/format";
import type { AdminProductRow } from "@/src/lib/admin";

const BULK_ACTIONS: { value: string; label: string }[] = [
  { value: "activate", label: "Set Active" },
  { value: "draft", label: "Set Draft" },
  { value: "archive", label: "Set Archived" },
  { value: "feature", label: "Feature" },
  { value: "unfeature", label: "Unfeature" },
  { value: "delete", label: "Delete" },
];

export default function ProductsTable({
  rows,
  basePath,
  currentSort,
  currentDir,
  extraParams,
  lowStockThreshold,
}: {
  rows: AdminProductRow[];
  basePath: string;
  currentSort?: string;
  currentDir?: string;
  extraParams: Record<string, string | undefined>;
  lowStockThreshold: number;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [action, setAction] = useState("activate");
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () => setSelected(allOnPage ? new Set() : new Set(rows.map((r) => r.id)));
  const toggleOne = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const ids = [...selected];

  const applyBulk = () => {
    if (ids.length === 0) return;
    if (action === "delete" && !confirm(`Delete ${ids.length} product${ids.length === 1 ? "" : "s"}? Products in past orders are archived instead.`)) {
      return;
    }
    startTransition(async () => {
      await bulkProductAction(ids, action);
      const label = BULK_ACTIONS.find((a) => a.value === action)?.label ?? action;
      toast(`${label}: ${ids.length} product${ids.length === 1 ? "" : "s"}`);
      setSelected(new Set());
    });
  };

  return (
    <div>
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm">
          <span className="font-medium text-blue-800">{selected.size} selected</span>
          <div className="ml-auto flex items-center gap-2">
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-500"
            >
              {BULK_ACTIONS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={applyBulk}
              disabled={pending}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70"
            >
              {pending ? "Applying…" : "Apply"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <Th className="w-10">
                <input
                  type="checkbox"
                  checked={allOnPage}
                  onChange={toggleAll}
                  aria-label="Select all"
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
              </Th>
              <SortableHeader label="Product" column="name" basePath={basePath} currentSort={currentSort} currentDir={currentDir} extraParams={extraParams} />
              <Th>Category</Th>
              <SortableHeader label="Price" column="price" basePath={basePath} currentSort={currentSort} currentDir={currentDir} extraParams={extraParams} />
              <SortableHeader label="Stock" column="stock" basePath={basePath} currentSort={currentSort} currentDir={currentDir} extraParams={extraParams} />
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((p) => {
              const threshold = p.lowStockThreshold ?? lowStockThreshold;
              return (
                <tr key={p.id} className={selected.has(p.id) ? "bg-blue-50/40" : "hover:bg-slate-50"}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleOne(p.id)}
                      aria-label={`Select ${p.name}`}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-slate-100">
                        {p.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div>
                        <Link href={`/admin/products/${p.id}`} className="font-medium text-blue-600 hover:underline">
                          {p.name}
                        </Link>
                        <div className="text-xs text-slate-400">
                          {p.brandName}
                          {p.featured && <span className="ml-1 text-amber-500">★</span>}
                          {p.variantCount > 0 && (
                            <span className="ml-1">· {p.variantCount} variant{p.variantCount === 1 ? "" : "s"}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.categoryName}</td>
                  <td className="px-4 py-3 text-slate-900">
                    {formatQAR(p.price)}
                    {p.compareAtPrice != null && p.compareAtPrice > p.price && (
                      <span className="ml-1 text-xs text-slate-400 line-through">{formatQAR(p.compareAtPrice)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        p.stock <= 0
                          ? "font-semibold text-rose-600"
                          : p.stock <= threshold
                            ? "font-semibold text-amber-600"
                            : "text-slate-700"
                      }
                    >
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/admin/products/${p.id}`} className="font-medium text-blue-600 hover:underline">Edit</Link>
                      <form action={deleteProduct.bind(null, p.id)}>
                        <button type="submit" className="font-medium text-slate-400 transition hover:text-rose-600">Delete</button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
