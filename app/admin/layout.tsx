// Admin layout: gates the whole /admin subtree behind an admin role and wraps
// it in the Shopify-style shell (AdminShell). The storefront Header/Footer are
// hidden here (see ConditionalChrome).

import { requireRole } from "@/src/lib/auth";
import AdminShell from "./AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Redirects to /login (if signed out) or / (if not staff).
  const user = await requireRole(["ADMIN", "SUPERADMIN"]);

  return <AdminShell userName={user.name}>{children}</AdminShell>;
}
