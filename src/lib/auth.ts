// Authentication core: server-side sessions backed by the database.
//
// Login state is a `Session` row whose unguessable token lives in an httpOnly
// `session` cookie. Reading the current user works anywhere (Server Components,
// actions); creating/destroying sessions writes a cookie, so it's only valid
// inside a Server Action or Route Handler.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import type { Role } from "@/app/generated/prisma/client";
import { prisma } from "@/src/lib/prisma";
import { withDbRetry } from "@/src/lib/db";

export const SESSION_COOKIE = "session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

// The safe, serializable shape of the logged-in user (never the password hash).
export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  // Admin section keys a STAFF member may access (empty for customers; ignored
  // for superadmins, who have full access). See src/lib/permissions.ts.
  permissions: string[];
}

/**
 * Create a session for a user and set the cookie. Server Action / Route Handler
 * only (it writes a cookie).
 */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await withDbRetry(() =>
    prisma.session.create({ data: { token, userId, expiresAt } })
  );

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
  });
}

/**
 * The currently signed-in user, or `null`. Also returns null for expired
 * sessions and disabled accounts. Safe to call from Server Components.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await withDbRetry(() =>
    prisma.session.findUnique({ where: { token }, include: { user: true } })
  );

  if (!session || session.expiresAt < new Date() || session.user.disabled) {
    return null;
  }

  const { user } = session;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: user.permissions,
  };
}

/** Delete the current session and clear the cookie. Server Action only. */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return;

  await withDbRetry(() => prisma.session.deleteMany({ where: { token } }));
  store.delete(SESSION_COOKIE);
}

/** Require a signed-in user, or redirect to /login. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Require one of the given roles, or redirect. Foundation for the admin panel. */
export async function requireRole(roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/");
  return user;
}
