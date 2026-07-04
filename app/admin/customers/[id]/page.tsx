// Admin customer profile: /admin/customers/[id]
// Contact info, lifetime value, order history, tags, internal notes, and a
// working enable/disable (disabling blocks ordering server-side and kills the
// customer's sessions — see toggleUserDisabled).

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomer } from "@/src/lib/admin";
import { requireSection } from "@/src/lib/require-section";
import {
  toggleUserDisabled,
  updateCustomerNotes,
  addCustomerTag,
  removeCustomerTag,
} from "@/app/admin/actions";
import Breadcrumbs from "@/app/admin/_components/Breadcrumbs";
import StatusBadge from "@/app/admin/_components/StatusBadge";
import { DataTable, Thead, Th, Tbody } from "@/app/admin/_components/DataTable";
import EmptyState from "@/app/admin/_components/EmptyState";
import { formatQAR } from "@/src/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Customer — FirstStop Admin" };

export default async function AdminCustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSection("customers");

  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer || customer.role !== "CUSTOMER") notFound();

  const avgOrder = customer.orderCount > 0 ? customer.spend / customer.orderCount : 0;

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumbs
        items={[{ label: "Customers", href: "/admin/customers" }, { label: customer.name }]}
      />

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{customer.name}</h1>
            <StatusBadge status={customer.disabled ? "DISABLED" : "ACTIVE"} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {customer.email} · Joined {customer.createdAt.toLocaleDateString("en-GB")}
          </p>
        </div>

        <form action={toggleUserDisabled.bind(null, customer.id)}>
          <button
            type="submit"
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              customer.disabled
                ? "bg-green-600 text-white hover:bg-green-700"
                : "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
            }`}
          >
            {customer.disabled ? "Enable account" : "Disable account"}
          </button>
        </form>
      </div>

      {customer.disabled && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          This account is <strong>disabled</strong>. The customer is signed out and cannot log in or
          place orders until re-enabled.
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Lifetime value
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatQAR(customer.spend)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Orders</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{customer.orderCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Average order
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatQAR(avgOrder)}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        {/* Order history */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Order history</h2>
          {customer.orders.length === 0 ? (
            <EmptyState title="No orders yet" description="This customer hasn't placed any orders." />
          ) : (
            <DataTable>
              <Thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Date</Th>
                  <Th className="text-right">Items</Th>
                  <Th className="text-right">Total</Th>
                  <Th>Status</Th>
                </tr>
              </Thead>
              <Tbody>
                {customer.orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        #{o.id.slice(-8).toUpperCase()}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {o.createdAt.toLocaleDateString("en-GB")}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{o.itemCount}</td>
                    <td className="px-4 py-3 text-right text-slate-900">
                      {formatQAR(o.total)}
                      {o.discount > 0 && (
                        <span className="ml-1 text-xs text-green-600">
                          (−{formatQAR(o.discount)})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
              </Tbody>
            </DataTable>
          )}
        </section>

        {/* Tags + internal notes */}
        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-900">Tags</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {customer.tags.length === 0 && (
                <span className="text-sm text-slate-400">No tags yet.</span>
              )}
              {customer.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                >
                  {tag}
                  <form action={removeCustomerTag.bind(null, customer.id, tag)}>
                    <button
                      type="submit"
                      aria-label={`Remove tag ${tag}`}
                      className="text-slate-400 transition hover:text-rose-600"
                    >
                      ×
                    </button>
                  </form>
                </span>
              ))}
            </div>
            <form action={addCustomerTag.bind(null, customer.id)} className="mt-3 flex gap-2">
              <input
                type="text"
                name="tag"
                placeholder="Add a tag…"
                aria-label="Add a tag"
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Add
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-900">Internal notes</h3>
            <p className="mt-0.5 text-xs text-slate-400">Only visible to staff.</p>
            <form action={updateCustomerNotes.bind(null, customer.id)} className="mt-3">
              <textarea
                name="notes"
                rows={5}
                defaultValue={customer.notes ?? ""}
                placeholder="Add a note about this customer…"
                className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="submit"
                className="mt-2 w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Save note
              </button>
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}
