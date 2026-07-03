// Account page: /account (protected)
//
// Shows the signed-in user's profile, a change-password form, sign out, and
// order history. Order history is empty until checkout is built (Order.userId
// gets populated then) — the section is wired and ready.

import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/src/lib/auth";
import { logout } from "@/app/auth/actions";
import { prisma } from "@/src/lib/prisma";
import { withDbRetry } from "@/src/lib/db";
import { ChangePasswordForm } from "@/app/components/AuthForms";
import { formatQAR } from "@/src/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your Account — FirstStop",
  description: "Manage your FirstStop account.",
};

const ROLE_LABELS: Record<string, string> = {
  CUSTOMER: "Customer",
  ADMIN: "Admin",
  SUPERADMIN: "Super Admin",
};

export default async function AccountPage() {
  const user = await requireUser(); // redirects to /login if signed out

  const orders = await withDbRetry(() =>
    prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, total: true, createdAt: true },
    })
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Your Account
        </h1>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Sign out
          </button>
        </form>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile */}
        <section className="rounded-2xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-900">Profile</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Name</dt>
              <dd className="font-medium text-slate-900">{user.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium text-slate-900">{user.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Account type</dt>
              <dd>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                  {ROLE_LABELS[user.role] ?? user.role}
                </span>
              </dd>
            </div>
          </dl>
        </section>

        {/* Change password */}
        <section className="rounded-2xl border border-slate-200 p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Change password</h2>
          <ChangePasswordForm />
        </section>
      </div>

      {/* Order history */}
      <section className="mt-6 rounded-2xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900">Order history</h2>
        {orders.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-sm font-medium text-slate-900">No orders yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Checkout arrives in a later phase — your orders will appear here.
            </p>
            <Link
              href="/products"
              className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline"
            >
              Start shopping →
            </Link>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/account/orders/${order.id}`}
                  className="-mx-2 flex items-center justify-between rounded-lg px-2 py-3 text-sm transition hover:bg-slate-50"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      Order #{order.id.slice(-8).toUpperCase()}
                    </p>
                    <p className="text-slate-500">
                      {order.createdAt.toLocaleDateString("en-GB")} · {order.status}
                    </p>
                  </div>
                  <span className="flex items-center gap-2 font-semibold text-slate-900">
                    {formatQAR(order.total)}
                    <span aria-hidden="true" className="text-slate-300">
                      ›
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
