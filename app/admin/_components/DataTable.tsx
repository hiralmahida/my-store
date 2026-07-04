// Reusable admin table primitives with consistent styling, plus a sortable
// column header that toggles ?sort/?dir in the URL (server-side sorting).

import Link from "next/link";

export function DataTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-100 text-sm">{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </thead>
  );
}

export function Th({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return <th className={`px-4 py-3 ${className}`}>{children}</th>;
}

export function Tbody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>;
}

/**
 * A sortable column header. Clicking it sets `?sort=<column>&dir=asc|desc`
 * (toggling direction when already active) while preserving any `extraParams`.
 */
export function SortableHeader({
  label,
  column,
  basePath,
  currentSort,
  currentDir,
  extraParams = {},
  className = "",
}: {
  label: string;
  column: string;
  basePath: string;
  currentSort?: string;
  currentDir?: string;
  extraParams?: Record<string, string | undefined>;
  className?: string;
}) {
  const active = currentSort === column;
  const nextDir = active && currentDir === "asc" ? "desc" : "asc";

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(extraParams)) {
    if (v != null && v !== "") params.set(k, v);
  }
  params.set("sort", column);
  params.set("dir", nextDir);

  return (
    <th className={`px-4 py-3 ${className}`}>
      <Link
        href={`${basePath}?${params.toString()}`}
        className="inline-flex items-center gap-1 transition hover:text-slate-800"
      >
        {label}
        <span className="text-slate-400">{active ? (currentDir === "asc" ? "▲" : "▼") : "⇅"}</span>
      </Link>
    </th>
  );
}
