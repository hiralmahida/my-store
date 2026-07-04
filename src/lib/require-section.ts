// Server-only guard for admin section access. Kept separate from the pure
// src/lib/permissions.ts so that Client Components can import the permission
// constants/helpers without pulling in server-only code (auth → Prisma).

import { redirect } from "next/navigation";
import { requireRole, type CurrentUser } from "@/src/lib/auth";
import { canAccess, type AdminSection } from "@/src/lib/permissions";

/**
 * Require admin access to a section, or redirect. Redirects to /login if signed
 * out, / if not staff, and /admin if staff without this specific permission.
 * Returns the user for convenience.
 */
export async function requireSection(section: AdminSection): Promise<CurrentUser> {
  const user = await requireRole(["ADMIN", "SUPERADMIN"]);
  if (!canAccess(user, section)) redirect("/admin");
  return user;
}
