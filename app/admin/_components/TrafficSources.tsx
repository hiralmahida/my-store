// Traffic-source breakdown: a stacked share bar plus a per-channel legend with
// session counts and percentages. Data is derived (see getTrafficSources).

import type { TrafficSource } from "@/src/lib/admin";

// A fixed palette so channels keep a consistent colour across renders.
const COLORS: Record<string, string> = {
  Direct: "bg-blue-500",
  Google: "bg-emerald-500",
  Social: "bg-violet-500",
  Referral: "bg-amber-500",
  Campaigns: "bg-rose-500",
};

function fallbackColor(i: number): string {
  return ["bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500", "bg-rose-500"][i % 5];
}

export default function TrafficSources({
  total,
  sources,
}: {
  total: number;
  sources: TrafficSource[];
}) {
  return (
    <div>
      <p className="text-2xl font-bold text-slate-900">{total.toLocaleString("en-US")}</p>
      <p className="text-xs text-slate-400">sessions in this period</p>

      {/* Stacked share bar */}
      <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-slate-100">
        {sources.map((s, i) => (
          <div
            key={s.name}
            className={COLORS[s.name] ?? fallbackColor(i)}
            style={{ width: `${s.pct}%` }}
            title={`${s.name}: ${s.pct}%`}
          />
        ))}
      </div>

      {/* Legend */}
      <ul className="mt-4 space-y-2">
        {sources.map((s, i) => (
          <li key={s.name} className="flex items-center gap-2 text-sm">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${COLORS[s.name] ?? fallbackColor(i)}`} />
            <span className="text-slate-600">{s.name}</span>
            <span className="ml-auto tabular-nums text-slate-400">
              {s.value.toLocaleString("en-US")}
            </span>
            <span className="w-10 text-right font-semibold tabular-nums text-slate-700">{s.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
