// URL-based pagination for admin tables. Preserves any extra query params
// (filters, sort) while changing the page.

import Link from "next/link";

function pageWindow(current: number, total: number): (number | null)[] {
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | null)[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push(null);
    out.push(p);
    prev = p;
  }
  return out;
}

export default function AdminPagination({
  basePath,
  page,
  totalPages,
  totalItems,
  extraParams = {},
}: {
  basePath: string;
  page: number;
  totalPages: number;
  totalItems?: number;
  extraParams?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) {
    return totalItems != null ? (
      <p className="mt-3 text-xs text-slate-400">{totalItems} total</p>
    ) : null;
  }

  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(extraParams)) {
      if (v != null && v !== "") params.set(k, v);
    }
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  };

  const link = "inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-slate-200 px-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100";
  const disabled = "inline-flex h-8 min-w-8 cursor-not-allowed items-center justify-center rounded-md border border-slate-100 px-2.5 text-sm text-slate-300";

  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-2">
      <p className="text-xs text-slate-400">
        {totalItems != null ? `${totalItems} total · ` : ""}Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-1.5">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className={link} rel="prev">‹</Link>
        ) : (
          <span className={disabled}>‹</span>
        )}
        {pageWindow(page, totalPages).map((p, i) =>
          p === null ? (
            <span key={`g${i}`} className="px-1 text-slate-400">…</span>
          ) : p === page ? (
            <span key={p} aria-current="page" className="inline-flex h-8 min-w-8 items-center justify-center rounded-md bg-blue-600 px-2.5 text-sm font-semibold text-white">
              {p}
            </span>
          ) : (
            <Link key={p} href={hrefFor(p)} className={link}>{p}</Link>
          )
        )}
        {page < totalPages ? (
          <Link href={hrefFor(page + 1)} className={link} rel="next">›</Link>
        ) : (
          <span className={disabled}>›</span>
        )}
      </div>
    </nav>
  );
}
