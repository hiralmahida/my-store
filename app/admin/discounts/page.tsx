// Admin discounts list: /admin/discounts
// All coupon codes with type, value, guardrails, usage and status. Create,
// edit, toggle active and delete.

import type { Metadata } from "next";
import Link from "next/link";
import { listCoupons } from "@/src/lib/admin";
import { requireSection } from "@/src/lib/require-section";
import { toggleCouponActive, deleteCoupon } from "@/app/admin/actions";
import { DataTable, Thead, Th, Tbody } from "@/app/admin/_components/DataTable";
import EmptyState from "@/app/admin/_components/EmptyState";
import StatusBadge from "@/app/admin/_components/StatusBadge";
import { formatQAR } from "@/src/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Discounts — FirstStop Admin" };

function valueLabel(type: string, value: { toString(): string }): string {
  const v = Number(value.toString());
  return type === "PERCENTAGE" ? `${v}% off` : `${formatQAR(v)} off`;
}

export default async function DiscountsPage() {
  await requireSection("discounts");
  const coupons = await listCoupons();

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Discounts</h1>
          <p className="mt-1 text-sm text-slate-500">Coupon codes and automatic promotions.</p>
        </div>
        <Link
          href="/admin/discounts/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          New coupon
        </Link>
      </div>

      {coupons.length === 0 ? (
        <EmptyState
          title="No coupons yet"
          description="Create a coupon code (percentage or fixed amount) with a minimum order, expiry and usage limit that applies at checkout."
          actionLabel="New coupon"
          actionHref="/admin/discounts/new"
        />
      ) : (
        <DataTable>
          <Thead>
            <tr>
              <Th>Code</Th>
              <Th>Discount</Th>
              <Th>Min order</Th>
              <Th>Expires</Th>
              <Th className="text-right">Usage</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {coupons.map((c) => {
              const expired = c.expiresAt != null && c.expiresAt < new Date();
              const limitReached = c.usageLimit != null && c.usageCount >= c.usageLimit;
              return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    <Link
                      href={`/admin/discounts/${c.id}`}
                      className="hover:text-blue-600 hover:underline"
                    >
                      {c.code}
                    </Link>
                    {c.automatic && (
                      <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-indigo-700">
                        Auto
                      </span>
                    )}
                    {c.description && (
                      <span className="mt-0.5 block text-xs font-normal text-slate-400">
                        {c.description}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{valueLabel(c.type, c.value)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.minOrder ? formatQAR(c.minOrder) : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.expiresAt ? (
                      <span className={expired ? "text-rose-600" : ""}>
                        {c.expiresAt.toLocaleDateString("en-GB")}
                      </span>
                    ) : (
                      "Never"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {c.usageCount}
                    {c.usageLimit != null ? ` / ${c.usageLimit}` : ""}
                    {limitReached && <span className="ml-1 text-xs text-rose-600">(full)</span>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.active ? "ACTIVE" : "DISABLED"} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <form action={toggleCouponActive.bind(null, c.id)}>
                        <button
                          type="submit"
                          className="font-medium text-slate-600 hover:underline"
                        >
                          {c.active ? "Disable" : "Enable"}
                        </button>
                      </form>
                      <Link
                        href={`/admin/discounts/${c.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        Edit
                      </Link>
                      <form action={deleteCoupon.bind(null, c.id)}>
                        <button
                          type="submit"
                          className="font-medium text-rose-600 hover:underline"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </Tbody>
        </DataTable>
      )}
    </div>
  );
}
