// Orders table with row selection + bulk actions. Client component: rows are
// passed in as plain serializable data from the server page.

"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import StatusBadge from "@/app/admin/_components/StatusBadge";
import { SortableHeader, Th } from "@/app/admin/_components/DataTable";
import { bulkUpdateOrderStatus } from "@/app/admin/actions";
import { useToast } from "@/app/components/ToastProvider";
import { formatQAR } from "@/src/lib/format";

export interface OrderRowData {
  id: string;
  shortId: string;
  customerName: string;
  total: number;
  status: string;
  itemsCount: number;
  date: string;
  tags: string[];
}

const BULK_STATUSES = ["PAID", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

export default function OrdersTable({
  rows,
  basePath,
  currentSort,
  currentDir,
  extraParams,
}: {
  rows: OrderRowData[];
  basePath: string;
  currentSort?: string;
  currentDir?: string;
  extraParams: Record<string, string | undefined>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("SHIPPED");
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () =>
    setSelected(allOnPage ? new Set() : new Set(rows.map((r) => r.id)));
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
    startTransition(async () => {
      await bulkUpdateOrderStatus(ids, bulkStatus);
      toast(`Updated ${ids.length} order${ids.length === 1 ? "" : "s"} to ${bulkStatus.toLowerCase()}`);
      setSelected(new Set());
    });
  };

  const exportSelected = () => {
    if (ids.length === 0) return;
    window.location.href = `/admin/orders/export?ids=${ids.join(",")}`;
  };

  return (
    <div>
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm">
          <span className="font-medium text-blue-800">{selected.size} selected</span>
          <div className="ml-auto flex items-center gap-2">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-500"
            >
              {BULK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  Mark {s.charAt(0) + s.slice(1).toLowerCase()}
                </option>
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
            <button
              type="button"
              onClick={exportSelected}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Export selected
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
              <SortableHeader label="Order" column="date" basePath={basePath} currentSort={currentSort} currentDir={currentDir} extraParams={extraParams} />
              <SortableHeader label="Customer" column="customer" basePath={basePath} currentSort={currentSort} currentDir={currentDir} extraParams={extraParams} />
              <Th>Items</Th>
              <SortableHeader label="Total" column="total" basePath={basePath} currentSort={currentSort} currentDir={currentDir} extraParams={extraParams} />
              <SortableHeader label="Status" column="status" basePath={basePath} currentSort={currentSort} currentDir={currentDir} extraParams={extraParams} />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((o) => (
              <tr key={o.id} className={selected.has(o.id) ? "bg-blue-50/40" : "hover:bg-slate-50"}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(o.id)}
                    onChange={() => toggleOne(o.id)}
                    aria-label={`Select order ${o.shortId}`}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${o.id}`} className="font-medium text-blue-600 hover:underline">
                    #{o.shortId}
                  </Link>
                  <div className="text-xs text-slate-400">{o.date}</div>
                  {o.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {o.tags.map((t) => (
                        <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{o.customerName}</td>
                <td className="px-4 py-3 text-slate-600">{o.itemsCount}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{formatQAR(o.total)}</td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
