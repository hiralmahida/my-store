// Top-selling categories as cards, each with its revenue and change vs the
// previous equal-length period (green ▲ up / rose ▼ down).

import { formatQAR } from "@/src/lib/format";
import type { TopCategory } from "@/src/lib/admin";

function ChangeBadge({ changePct }: { changePct: number | null }) {
  if (changePct == null) {
    return <span className="text-xs font-medium text-slate-400">New</span>;
  }
  const up = changePct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
        up ? "text-green-600" : "text-rose-600"
      }`}
    >
      {up ? "▲" : "▼"} {Math.abs(changePct)}%
    </span>
  );
}

export default function TopCategories({ categories }: { categories: TopCategory[] }) {
  if (categories.length === 0) {
    return <p className="text-sm text-slate-400">No category sales in this period.</p>;
  }

  const max = Math.max(1, ...categories.map((c) => c.revenue));

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {categories.map((c) => (
        <li key={c.name} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-medium text-slate-700">{c.name}</p>
            <ChangeBadge changePct={c.changePct} />
          </div>
          <p className="mt-1 text-lg font-bold text-slate-900">{formatQAR(c.revenue)}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-500"
              style={{ width: `${Math.max(4, (c.revenue / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
