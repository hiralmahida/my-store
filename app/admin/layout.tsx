// Admin layout: gates the whole /admin subtree behind an admin role and wraps
// it in a dark sidebar shell. The storefront Header/Footer are hidden here (see
// ConditionalChrome).

import Link from "next/link";
import { requireRole } from "@/src/lib/auth";
import { logout } from "@/app/auth/actions";
import AdminNav from "./AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Redirects to /login (if signed out) or / (if not staff).
  const user = await requireRole(["ADMIN", "SUPERADMIN"]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="flex w-60 shrink-0 flex-col bg-slate-900 px-4 py-6 text-white">
        <Link href="/admin" className="mb-8 flex items-center gap-2 px-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold">
            F
          </span>
          <span className="text-base font-semibold">
            FirstStop <span className="text-blue-400">Admin</span>
          </span>
        </Link>

        <AdminNav />

        <div className="mt-auto border-t border-slate-800 pt-4">
          <p className="px-3 text-xs text-slate-400">Signed in as</p>
          <p className="truncate px-3 text-sm font-medium">{user.name}</p>
          <Link
            href="/"
            className="mt-3 block rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            ← Back to store
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-x-auto">{children}</div>
    </div>
  );
}
