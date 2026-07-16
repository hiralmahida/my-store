// Staff permissions: which admin sections a signed-in user may access.
//
// Two staff tiers (see the `Role` enum): SUPERADMIN has full access and is the
// only role that can manage staff and store settings; ADMIN ("staff") is
// restricted to the sections listed in `user.permissions`. CUSTOMER has no
// admin access at all (the admin layout already blocks them).
//
// This module is intentionally PURE — it imports no server-only code (no
// Prisma, no next/navigation), so it's safe to import from Client Components
// (e.g. the AdminShell nav and the staff manager) as well as the server. The
// server-only `requireSection` guard lives in src/lib/require-section.ts.

import type { CurrentUser } from "@/src/lib/auth";

export type AdminSection =
  | "dashboard"
  | "orders"
  | "products"
  | "inventory"
  | "customers"
  | "discounts"
  | "transactions"
  | "campaigns"
  | "profile"
  | "settings";

/** The sections a staff account can be granted (Settings is superadmin-only,
 *  so it's excluded here — it never appears as a toggle; Dashboard and Profile
 *  are always available, so they're excluded too). */
export const GRANTABLE_SECTIONS: { key: AdminSection; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "orders", label: "Orders" },
  { key: "products", label: "Products" },
  { key: "inventory", label: "Inventory" },
  { key: "customers", label: "Customers" },
  { key: "discounts", label: "Discounts" },
  { key: "transactions", label: "Sales & Payments" },
  { key: "campaigns", label: "Marketing" },
];

const GRANTABLE_KEYS = new Set<string>(GRANTABLE_SECTIONS.map((s) => s.key));

/** Keep only recognised, grantable section keys (defensive against form input). */
export function sanitizePermissions(values: string[]): string[] {
  return [...new Set(values)].filter((v) => GRANTABLE_KEYS.has(v));
}

/**
 * Whether `user` may access an admin section.
 * - SUPERADMIN: everything.
 * - Settings: SUPERADMIN only (staff management + store details).
 * - Dashboard: any admin/superadmin (the landing page).
 * - Everything else: must be in the staff member's `permissions`.
 */
export function canAccess(user: CurrentUser, section: AdminSection): boolean {
  if (user.role === "SUPERADMIN") return true;
  if (section === "settings") return false;
  // Dashboard and the personal Profile page are available to every admin.
  if (section === "dashboard" || section === "profile") return true;
  return user.permissions.includes(section);
}
