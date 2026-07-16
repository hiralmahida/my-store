// Server Actions for the signed-in admin's own profile. Available to any admin
// (ADMIN or SUPERADMIN) — each only ever edits their own account.

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/src/lib/prisma";
import { withDbRetry } from "@/src/lib/db";
import { requireRole } from "@/src/lib/auth";
import { hashPassword, verifyPassword } from "@/src/lib/password";
import type { AdminActionState } from "@/app/admin/actions";

/** Update the current admin's display name and email. */
export async function updateProfile(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const me = await requireRole(["ADMIN", "SUPERADMIN"]);

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Enter your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = "Enter a valid email.";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  // Guard the unique email against collisions with a different account.
  const clash = await withDbRetry(() =>
    prisma.user.findUnique({ where: { email }, select: { id: true } })
  );
  if (clash && clash.id !== me.id) {
    return { fieldErrors: { email: "Another account already uses this email." } };
  }

  await withDbRetry(() =>
    prisma.user.update({ where: { id: me.id }, data: { name, email } })
  );

  revalidatePath("/admin/profile");
  return { success: "Profile updated." };
}

/** Change the current admin's password (verifies the current one first). */
export async function changePassword(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const me = await requireRole(["ADMIN", "SUPERADMIN"]);

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  const fieldErrors: Record<string, string> = {};
  if (!current) fieldErrors.currentPassword = "Enter your current password.";
  if (next.length < 8) fieldErrors.newPassword = "New password must be at least 8 characters.";
  if (next !== confirm) fieldErrors.confirmPassword = "Passwords don't match.";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const user = await withDbRetry(() =>
    prisma.user.findUnique({ where: { id: me.id }, select: { passwordHash: true } })
  );
  if (!user) return { error: "Account not found." };

  const ok = await verifyPassword(current, user.passwordHash);
  if (!ok) return { fieldErrors: { currentPassword: "That's not your current password." } };

  const passwordHash = await hashPassword(next);
  await withDbRetry(() =>
    prisma.user.update({ where: { id: me.id }, data: { passwordHash } })
  );

  return { success: "Password changed." };
}
