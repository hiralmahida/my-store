// Admin dashboard: /admin
//
// KPI cards (revenue, orders, AOV, customers) with a date-range picker, a
// sales-over-time chart driven by real orders, and panels for recent orders,
// top-selling products and low-stock alerts.

import type { Metadata } from "next";
import Link from "next/link";
import {
  resolveRange,
  getDashboardMetrics,
  getSalesSeries,
  getTopProducts,
  getRecentOrders,
  getLowStockProducts,
} from "@/src/lib/admin";
import { formatQAR } from "@/src/lib/format";
import StatCard from "./_components/StatCard";
import StatusBadge from "./_components/StatusBadge";
import EmptyState from "./_components/EmptyState";
import DateRangePicker from "./_components/DateRangePicker";
import SalesChart from "./_components/SalesChart";
import { DataTable, Thead, Th, Tbody } from "./_components/DataTable";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard — FirstStop Admin" };

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const range = resolveRange(await searchParams);

  const [metrics, series, topProducts, recentOrders, lowStock] = await Promise.all([
    getDashboardMetrics(range),
    getSalesSeries(range),
    getTopProducts(5, range),
    getRecentOrders(8),
    getLowStockProducts(6),
  ]);

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-0.5 text-sm text-slate-500">{range.label}</p>
        </div>
        <DateRangePicker current={range.key} />
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total revenue" value={formatQAR(metrics.revenue)} accent="text-green-600" hint={`${range.label}`} />
        <StatCard label="Orders" value={String(metrics.orders)} hint={`${metrics.salesOrders} paid`} />
        <StatCard label="Avg. order value" value={formatQAR(metrics.aov)} />
        <StatCard label="Customers" value={String(metrics.customers)} hint="all time" />
      </div>

      {/* Sales chart */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Sales over time</h2>
        <SalesChart series={series} />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Recent orders */}
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Recent orders</h2>
            <Link href="/admin/orders" className="text-sm font-medium text-blue-600 hover:underline">
              View all →
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <EmptyState title="No orders yet" description="Orders will appear here as customers check out." />
          ) : (
            <DataTable>
              <Thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Customer</Th>
                  <Th>Total</Th>
                  <Th>Status</Th>
                  <Th>Date</Th>
                </tr>
              </Thead>
              <Tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${o.id}`} className="font-medium text-blue-600 hover:underline">
                        #{o.id.slice(-8).toUpperCase()}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{o.customerName}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{formatQAR(o.total)}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3 text-slate-500">{o.createdAt.toLocaleDateString("en-GB")}</td>
                  </tr>
                ))}
              </Tbody>
            </DataTable>
          )}
        </section>

        {/* Side column: top products + low stock */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Top products</h2>
            {topProducts.length === 0 ? (
              <p className="text-sm text-slate-400">No sales in this period.</p>
            ) : (
              <ul className="space-y-2">
                {topProducts.map((p, i) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <Link href={`/admin/products/${p.id}`} className="truncate text-slate-700 hover:text-blue-600">
                      <span className="mr-2 text-slate-400">{i + 1}.</span>
                      {p.name}
                    </Link>
                    <span className="shrink-0 font-medium text-slate-900">{p.unitsSold} sold</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Low-stock alerts</h2>
            {lowStock.length === 0 ? (
              <p className="text-sm text-slate-400">All products are well stocked. 🎉</p>
            ) : (
              <ul className="space-y-2">
                {lowStock.map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <Link href={`/admin/products/${p.id}`} className="truncate text-slate-700 hover:text-blue-600">
                      {p.name}
                    </Link>
                    <span
                      className={`shrink-0 font-semibold ${p.stock === 0 ? "text-rose-600" : "text-amber-600"}`}
                    >
                      {p.stock} left
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
