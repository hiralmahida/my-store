// Admin customer list with enable/disable: /admin/customers

import type { Metadata } from "next";
import { listCustomers } from "@/src/lib/admin";
import { toggleUserDisabled } from "@/app/admin/actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Customers — FirstStop Admin" };

export default async function AdminCustomersPage() {
  const customers = await listCustomers();

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">
        Customers <span className="text-base font-normal text-slate-400">({customers.length})</span>
      </h1>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Orders</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                <td className="px-4 py-3 text-slate-600">{c.email}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {c.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{c.orderCount}</td>
                <td className="px-4 py-3 text-slate-500">{c.createdAt.toLocaleDateString("en-GB")}</td>
                <td className="px-4 py-3">
                  {c.disabled ? (
                    <span className="font-medium text-rose-600">Disabled</span>
                  ) : (
                    <span className="font-medium text-green-600">Active</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {c.role === "CUSTOMER" ? (
                    <form action={toggleUserDisabled.bind(null, c.id)}>
                      <button
                        type="submit"
                        className={`font-medium ${c.disabled ? "text-green-600 hover:underline" : "text-rose-600 hover:underline"}`}
                      >
                        {c.disabled ? "Enable" : "Disable"}
                      </button>
                    </form>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Disabling a customer immediately signs them out (their sessions stop resolving) and blocks
        future logins.
      </p>
    </div>
  );
}
