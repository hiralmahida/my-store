// Sales-over-time bar chart. Bars use a percentage height inside a fixed-height
// track (so heights resolve correctly), driven by real daily revenue.

import { formatQAR } from "@/src/lib/format";

export default function SalesChart({
  series,
}: {
  series: { date: string; revenue: number }[];
}) {
  const max = Math.max(1, ...series.map((s) => s.revenue));
  const allZero = series.every((s) => s.revenue === 0);
  const n = series.length;
  // How often to render an x-axis label so they don't overlap.
  const labelEvery = n <= 14 ? 1 : Math.ceil(n / 8);

  if (allZero) {
    return (
      <p className="flex h-48 items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-400">
        No revenue in this period yet.
      </p>
    );
  }

  return (
    <div>
      <div className="flex h-48 items-end gap-1">
        {series.map((d) => {
          const pct = (d.revenue / max) * 100;
          return (
            <div
              key={d.date}
              className="group/bar relative flex h-full flex-1 items-end"
              title={`${new Date(d.date).toLocaleDateString("en-GB")}: ${formatQAR(d.revenue)}`}
            >
              <div
                className="w-full rounded-t bg-blue-500/80 transition group-hover/bar:bg-blue-600"
                style={{ height: `${d.revenue > 0 ? Math.max(pct, 2) : 0}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1">
        {series.map((d, i) => (
          <div key={d.date} className="flex-1 text-center text-[9px] text-slate-400">
            {i % labelEvery === 0
              ? new Date(d.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
              : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
