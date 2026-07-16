// Admin Profile: /admin/profile
// The signed-in admin's own account — edit name/email and change password.
// Available to any admin (the /admin layout already enforces the role).

import type { Metadata } from "next";
import { requireRole } from "@/src/lib/auth";
import { ProfileDetailsForm, PasswordForm } from "./ProfileForms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Profile — FirstStop Admin" };

const ROLE_LABEL: Record<string, string> = {
  SUPERADMIN: "Superadmin",
  ADMIN: "Staff",
  CUSTOMER: "Customer",
};

export default async function ProfilePage() {
  const me = await requireRole(["ADMIN", "SUPERADMIN"]);

  return (
    <div className="p-6 sm:p-8">
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-slate-900">Your profile</h1>
      <p className="mb-6 text-sm text-slate-500">Manage your account details and password.</p>

      <div className="max-w-2xl space-y-8">
        {/* Identity summary */}
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xl font-semibold text-white">
            {me.name.charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="text-lg font-semibold text-slate-900">{me.name}</p>
            <p className="text-sm text-slate-500">{me.email}</p>
            <span className="mt-1 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              {ROLE_LABEL[me.role] ?? me.role}
            </span>
          </div>
        </div>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Account details</h2>
          <ProfileDetailsForm name={me.name} email={me.email} />
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Password</h2>
          <PasswordForm />
        </section>
      </div>
    </div>
  );
}
