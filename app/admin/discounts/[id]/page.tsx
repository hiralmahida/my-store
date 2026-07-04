// Edit a coupon: /admin/discounts/[id]

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSection } from "@/src/lib/require-section";
import { getCoupon } from "@/src/lib/admin";
import { updateCoupon } from "@/app/admin/actions";
import Breadcrumbs from "@/app/admin/_components/Breadcrumbs";
import CouponForm, { type CouponDefaults } from "../CouponForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit coupon — FirstStop Admin" };

function toDateInput(d: Date | null): string {
  if (!d) return "";
  // yyyy-MM-dd for <input type="date">
  return d.toISOString().slice(0, 10);
}

function toAmount(v: { toString(): string } | null): string {
  return v == null ? "" : String(Number(v.toString()));
}

export default async function EditCouponPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSection("discounts");

  const { id } = await params;
  const coupon = await getCoupon(id);
  if (!coupon) notFound();

  const defaults: CouponDefaults = {
    code: coupon.code,
    description: coupon.description ?? "",
    type: coupon.type,
    value: toAmount(coupon.value),
    minOrder: toAmount(coupon.minOrder),
    usageLimit: coupon.usageLimit != null ? String(coupon.usageLimit) : "",
    expiresAt: toDateInput(coupon.expiresAt),
    active: coupon.active,
    automatic: coupon.automatic,
  };

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumbs
        items={[{ label: "Discounts", href: "/admin/discounts" }, { label: coupon.code }]}
      />
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-slate-900">Edit coupon</h1>
      <p className="mb-6 text-sm text-slate-500">
        Used {coupon.usageCount} {coupon.usageCount === 1 ? "time" : "times"}.
      </p>
      <CouponForm
        action={updateCoupon.bind(null, coupon.id)}
        defaults={defaults}
        submitLabel="Save changes"
      />
    </div>
  );
}
