// Server Actions for authentication: register, login, logout, change password.
//
// The form actions follow the useActionState signature `(prevState, formData)`
// and return a serializable state object for inline error/success display.
// On success, register/login redirect to /account (redirect() throws a special
// signal, so it must stay outside any try/catch).

"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/src/lib/prisma";
import { withDbRetry } from "@/src/lib/db";
import { hashPassword, verifyPassword } from "@/src/lib/password";
import { createSession, destroySession, getCurrentUser } from "@/src/lib/auth";
import { mergeGuestCartIntoUser } from "@/src/lib/cart";

// Shape returned to the form via useActionState.
export interface AuthFormState {
  error?: string; // top-level message
  fieldErrors?: Record<string, string>; // per-field messages
  success?: string; // success message (e.g. password changed)
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Only allow same-origin relative paths as a post-login redirect target, to
// avoid open-redirect abuse. Falls back to /account.
function safeNext(value: FormDataEntryValue | null): string {
  const s = typeof value === "string" ? value : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/account";
}

/** Register a new account, sign in, and merge any guest cart. */
export async function register(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Please enter your name.";
  if (!isValidEmail(email)) fieldErrors.email = "Enter a valid email address.";
  if (password.length < 8) fieldErrors.password = "Password must be at least 8 characters.";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const existing = await withDbRetry(() =>
    prisma.user.findUnique({ where: { email }, select: { id: true } })
  );
  if (existing) {
    return { fieldErrors: { email: "An account with this email already exists." } };
  }

  const passwordHash = await hashPassword(password);
  const user = await withDbRetry(() =>
    prisma.user.create({ data: { name, email, passwordHash }, select: { id: true } })
  );

  await createSession(user.id);
  await mergeGuestCartIntoUser(user.id);
  redirect(safeNext(formData.get("next")));
}

/** Sign in with email + password, and merge any guest cart. */
export async function login(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const user = await withDbRetry(() => prisma.user.findUnique({ where: { email } }));

  // Same generic message whether the email is unknown, the password is wrong,
  // or the account is disabled — don't leak which accounts exist.
  const ok = user && !user.disabled && (await verifyPassword(password, user.passwordHash));
  if (!user || !ok) {
    return { error: "Invalid email or password." };
  }

  await createSession(user.id);
  await mergeGuestCartIntoUser(user.id);
  redirect(safeNext(formData.get("next")));
}

/** Sign out and return to the homepage. Used directly as a <form action>. */
export async function logout(): Promise<void> {
  await destroySession();
  redirect("/");
}

/** Change the signed-in user's password (requires the current password). */
export async function changePassword(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");

  if (next.length < 8) {
    return { fieldErrors: { next: "New password must be at least 8 characters." } };
  }

  const record = await withDbRetry(() =>
    prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } })
  );
  if (!record || !(await verifyPassword(current, record.passwordHash))) {
    return { fieldErrors: { current: "Current password is incorrect." } };
  }

  const passwordHash = await hashPassword(next);
  await withDbRetry(() =>
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } })
  );

  return { success: "Password updated." };
}
