// Admin layout: gates the whole /admin subtree behind an admin role and wraps
// it in the Shopify-style shell (AdminShell). The storefront Header/Footer are
// hidden here (see ConditionalChrome).

import { requireRole } from "@/src/lib/auth";
import { canAccess, type AdminSection } from "@/src/lib/permissions";
import AdminShell from "./AdminShell";

export const dynamic = "force-dynamic";

// Every admin section — the nav shows only those this user may access.
const ALL_SECTIONS: AdminSection[] = [
  "dashboard",
  "orders",
  "products",
  "inventory",
  "customers",
  "discounts",
  "transactions",
  "campaigns",
  "profile",
  "settings",
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Redirects to /login (if signed out) or / (if not staff).
  const user = await requireRole(["ADMIN", "SUPERADMIN"]);
  const sections = ALL_SECTIONS.filter((s) => canAccess(user, s));

  return (
    <AdminShell userName={user.name} sections={sections}>
      {children}
    </AdminShell>
  );
}
