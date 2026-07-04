import type { Metadata } from "next";
import EmptyState from "@/app/admin/_components/EmptyState";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Discounts — FirstStop Admin" };

export default function DiscountsPage() {
  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Discounts</h1>
      <p className="mt-1 text-sm text-slate-500">Coupon codes and promotions.</p>
      <div className="mt-6">
        <EmptyState
          title="Discounts are coming soon"
          description="Create coupon codes (percentage or fixed amount) with minimum order, expiry and usage limits that apply at checkout."
        />
      </div>
    </div>
  );
}
