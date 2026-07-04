// Admin Settings: /admin/settings  (superadmin-only)
// Store details + promo banner, and staff account management.

import type { Metadata } from "next";
import { requireRole } from "@/src/lib/auth";
import { requireSection } from "@/src/lib/require-section";
import { getStoreSettings } from "@/src/lib/settings";
import { listStaff } from "@/src/lib/admin";
import StoreDetailsForm from "./StoreDetailsForm";
import StaffManager, { type StaffView } from "./StaffManager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Settings — FirstStop Admin" };

export default async function SettingsPage() {
  // Settings (store details + staff) is superadmin-only. requireSection already
  // enforces this, but requireRole makes the intent explicit and gives us the
  // current user id for the staff manager.
  await requireSection("settings");
  const me = await requireRole(["SUPERADMIN"]);

  const [settings, staff] = await Promise.all([getStoreSettings(), listStaff()]);

  const staffView: StaffView[] = staff.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    role: s.role === "SUPERADMIN" ? "SUPERADMIN" : "ADMIN",
    disabled: s.disabled,
    permissions: s.permissions,
    createdAt: s.createdAt.toLocaleDateString("en-GB"),
  }));

  return (
    <div className="p-6 sm:p-8">
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
      <p className="mb-6 text-sm text-slate-500">
        Store details, promo banner and staff accounts.
      </p>

      <div className="max-w-3xl space-y-10">
        <StoreDetailsForm
          values={{
            storeName: settings.storeName,
            contactEmail: settings.contactEmail,
            contactPhone: settings.contactPhone,
            deliveryInfo: settings.deliveryInfo,
            promoText: settings.promoText,
            promoActive: settings.promoActive,
          }}
        />

        <section>
          <h2 className="mb-1 text-lg font-semibold text-slate-900">Staff</h2>
          <p className="mb-4 text-sm text-slate-500">
            Superadmins have full access. Staff can only reach the sections you grant them.
          </p>
          <StaffManager staff={staffView} currentUserId={me.id} />
        </section>
      </div>
    </div>
  );
}
