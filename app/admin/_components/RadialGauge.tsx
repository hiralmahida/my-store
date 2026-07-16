// Monthly-target radial gauge. A 270° SVG arc showing progress toward the
// month's revenue goal, with Target / Revenue / Today figures beneath. Pure
// SVG (no chart library), matching the hand-rolled SalesChart.

import { formatQAR } from "@/src/lib/format";

export default function RadialGauge({
  pct,
  target,
  revenue,
  today,
}: {
  pct: number; // 0–100
  target: number;
  revenue: number;
  today: number;
}) {
  const clamped = Math.max(0, Math.min(100, pct));

  // Geometry: a 270° arc (gap at the bottom), radius 70 in a 180×180 box.
  const size = 180;
  const stroke = 16;
  const r = (size - stroke) / 2 - 6;
  const cx = size / 2;
  const cy = size / 2;
  const arc = 270; // degrees swept
  const startAngle = 135; // bottom-left start (clockwise)
  const circumference = 2 * Math.PI * r;
  const arcLength = (arc / 360) * circumference;
  const dash = (clamped / 100) * arcLength;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={`Monthly target ${clamped}% reached`}
          style={{ transform: `rotate(${startAngle}deg)` }}
        >
          {/* Track */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="currentColor"
            className="text-slate-100"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference}`}
          />
          {/* Progress */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="currentColor"
            className="text-blue-600 transition-all"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-slate-900">{clamped}%</span>
          <span className="text-xs text-slate-400">of target</span>
        </div>
      </div>

      <dl className="mt-4 grid w-full grid-cols-3 gap-2 text-center">
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-slate-400">Target</dt>
          <dd className="mt-0.5 text-sm font-semibold text-slate-700">{formatQAR(target)}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-slate-400">Revenue</dt>
          <dd className="mt-0.5 text-sm font-semibold text-green-600">{formatQAR(revenue)}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-slate-400">Today</dt>
          <dd className="mt-0.5 text-sm font-semibold text-slate-700">{formatQAR(today)}</dd>
        </div>
      </dl>
    </div>
  );
}
