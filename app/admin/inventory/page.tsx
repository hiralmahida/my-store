import type { Metadata } from "next";
import EmptyState from "@/app/admin/_components/EmptyState";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Inventory — FirstStop Admin" };

export default function InventoryPage() {
  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inventory</h1>
      <p className="mt-1 text-sm text-slate-500">Stock levels, adjustments and low-stock alerts.</p>
      <div className="mt-6">
        <EmptyState
          title="Inventory management is coming soon"
          description="This section will list products and variants with current stock, inline adjustments, low-stock thresholds and a change history."
        />
      </div>
    </div>
  );
}
