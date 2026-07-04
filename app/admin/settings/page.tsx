import type { Metadata } from "next";
import EmptyState from "@/app/admin/_components/EmptyState";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Settings — FirstStop Admin" };

export default function SettingsPage() {
  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
      <p className="mt-1 text-sm text-slate-500">Store details and staff.</p>
      <div className="mt-6">
        <EmptyState
          title="Settings are coming soon"
          description="Manage staff accounts and roles, plus basic store details like name, contact and delivery info."
        />
      </div>
    </div>
  );
}
