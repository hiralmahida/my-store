// Server-rendered pagination. Every control is a plain <Link>, so paging works
// without client JavaScript and each page has its own shareable URL.

import Link from "next/link";
import type { ProductFilters } from "@/src/lib/products";
import { buildQueryString } from "@/src/lib/catalog-params";

// Produce a compact list of page numbers to show, with `null` marking a gap
// (rendered as an ellipsis). e.g. for page 6 of 20: 1 … 5 6 7 … 20
function pageWindow(current: number, total: number): (number | null)[] {
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const out: (number | null)[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push(null); // gap
    out.push(p);
    prev = p;
  }
  return out;
}

export default function Pagination({
  basePath,
  filters,
  page,
  totalPages,
}: {
  basePath: string;
  filters: ProductFilters;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const hrefFor = (p: number) => `${basePath}${buildQueryString(filters, { page: p })}`;

  const linkClass =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100";
  const disabledClass =
    "inline-flex h-9 min-w-9 cursor-not-allowed items-center justify-center rounded-md border border-slate-100 px-3 text-sm font-medium text-slate-300";

  return (
    <nav
      aria-label="Pagination"
      className="mt-10 flex items-center justify-center gap-1.5"
    >
      {/* Previous */}
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={linkClass} rel="prev">
          ‹ Prev
        </Link>
      ) : (
        <span className={disabledClass} aria-disabled="true">
          ‹ Prev
        </span>
      )}

      {/* Numbered pages */}
      {pageWindow(page, totalPages).map((p, i) =>
        p === null ? (
          <span key={`gap-${i}`} className="px-1 text-slate-400">
            …
          </span>
        ) : p === page ? (
          <span
            key={p}
            aria-current="page"
            className="inline-flex h-9 min-w-9 items-center justify-center rounded-md bg-blue-600 px-3 text-sm font-semibold text-white"
          >
            {p}
          </span>
        ) : (
          <Link key={p} href={hrefFor(p)} className={linkClass}>
            {p}
          </Link>
        )
      )}

      {/* Next */}
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className={linkClass} rel="next">
          Next ›
        </Link>
      ) : (
        <span className={disabledClass} aria-disabled="true">
          Next ›
        </span>
      )}
    </nav>
  );
}
