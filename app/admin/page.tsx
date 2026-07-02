// Admin dashboard: /admin
//
// Live KPIs, a 7-day revenue bar chart, top products, and a real-time
// notifications feed (recent history + live updates over SSE).

import type { Metadata } from "next";
import Link from "next/link";
import {
  getAdminStats,
  getRevenueByDay,
  getTopProducts,
  getRecentNotifications,
} from "@/src/lib/admin";
import { formatQAR } from "@/src/lib/format";
import AdminNotificationsFeed, { type FeedItem } from "./AdminNotificationsFeed";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Dashboard — FirstStop Admin" };

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ?? "text-slate-900"}`}>{value}</p>
    </div>
  );
}

export default async function AdminDashboard() {
  const [stats, revenue, topProducts, notifications] = await Promise.all([
    getAdminStats(),
    getRevenueByDay(7),
    getTopProducts(5),
    getRecentNotifications(20),
  ]);

  const maxRevenue = Math.max(1, ...revenue.map((r) => r.revenue));
  const feed: FeedItem[] = notifications.map((n) => ({
    id: n.id,
    kind: n.kind,
    message: n.message,
    at: n.createdAt.toISOString(),
  }));

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Orders today" value={String(stats.ordersToday)} />
        <StatCard label="Revenue today" value={formatQAR(stats.revenueToday)} accent="text-green-600" />
        <StatCard label="Products" value={String(stats.totalProducts)} />
        <StatCard
          label="Low-stock items"
          value={String(stats.lowStock)}
          accent={stats.lowStock > 0 ? "text-amber-600" : "text-slate-900"}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Revenue chart + top products */}
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">
              Revenue — last 7 days
            </h2>
            <div className="flex h-40 items-end gap-2">
              {revenue.map((day) => (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t bg-blue-500/80"
                      style={{ height: `${(day.revenue / maxRevenue) * 100}%` }}
                      title={formatQAR(day.revenue)}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(day.date).toLocaleDateString("en-GB", { weekday: "short" })}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Top products</h2>
            {topProducts.length === 0 ? (
              <p className="text-sm text-slate-400">No sales yet.</p>
            ) : (
              <ul className="space-y-2">
                {topProducts.map((p, i) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">
                      <span className="mr-2 text-slate-400">{i + 1}.</span>
                      {p.name}
                    </span>
                    <span className="font-medium text-slate-900">{p.unitsSold} sold</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Live notifications */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <AdminNotificationsFeed initial={feed} />
        </section>
      </div>

      <div className="mt-6 flex gap-3 text-sm">
        <Link href="/admin/orders" className="font-medium text-blue-600 hover:underline">
          View all orders →
        </Link>
        <Link href="/admin/products" className="font-medium text-blue-600 hover:underline">
          Manage products →
        </Link>
      </div>
    </div>
  );
}
