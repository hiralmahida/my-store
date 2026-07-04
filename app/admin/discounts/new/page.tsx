// Create a coupon: /admin/discounts/new

import type { Metadata } from "next";
import { requireSection } from "@/src/lib/require-section";
import { createCoupon } from "@/app/admin/actions";
import Breadcrumbs from "@/app/admin/_components/Breadcrumbs";
import CouponForm from "../CouponForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New coupon — FirstStop Admin" };

export default async function NewCouponPage() {
  await requireSection("discounts");

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumbs
        items={[{ label: "Discounts", href: "/admin/discounts" }, { label: "New coupon" }]}
      />
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">New coupon</h1>
      <CouponForm action={createCoupon} submitLabel="Create coupon" />
    </div>
  );
}
