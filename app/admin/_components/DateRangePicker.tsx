// Dashboard date-range control: preset buttons (Today / 7d / 30d / 90d) plus a
// custom from–to form. Plain links/form (server component) — the dashboard
// reads the resulting ?range or ?from/?to params.

import Link from "next/link";

const PRESETS: [string, string][] = [
  ["today", "Today"],
  ["7d", "7 days"],
  ["30d", "30 days"],
  ["90d", "90 days"],
];

export default function DateRangePicker({ current }: { current: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
        {PRESETS.map(([key, label]) => (
          <Link
            key={key}
            href={`/admin?range=${key}`}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              current === key ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
      <form action="/admin" className="flex items-center gap-1.5">
        <input
          type="date"
          name="from"
          aria-label="From date"
          className="rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-500"
        />
        <span className="text-slate-400">–</span>
        <input
          type="date"
          name="to"
          aria-label="To date"
          className="rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Apply
        </button>
      </form>
    </div>
  );
}
