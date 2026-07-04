// Staff manager (Settings, superadmin-only): list existing staff with an inline
// role + permissions editor and a disable toggle, plus an "add staff" form.
//
// The add form uses useActionState (createStaff) for inline validation errors.
// The per-row editors are plain server-action forms (no client state needed).

"use client";

import { useActionState } from "react";
import {
  createStaff,
  updateStaffAccess,
  toggleUserDisabled,
  type AdminActionState,
} from "@/app/admin/actions";
import { GRANTABLE_SECTIONS } from "@/src/lib/permissions";

const INITIAL: AdminActionState = {};

export interface StaffView {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "SUPERADMIN";
  disabled: boolean;
  permissions: string[];
  createdAt: string; // preformatted date
}

export default function StaffManager({
  staff,
  currentUserId,
}: {
  staff: StaffView[];
  currentUserId: string;
}) {
  const [state, formAction, pending] = useActionState(createStaff, INITIAL);

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <div className="space-y-6">
      {/* Existing staff */}
      <div className="space-y-4">
        {staff.map((s) => {
          const isSelf = s.id === currentUserId;
          return (
            <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">
                    {s.name}
                    {isSelf && <span className="ml-2 text-xs font-normal text-slate-400">(you)</span>}
                  </p>
                  <p className="text-sm text-slate-500">{s.email}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {s.role === "SUPERADMIN" ? "Superadmin" : "Staff"} · added {s.createdAt}
                    {s.disabled && <span className="ml-1 font-medium text-rose-600">· disabled</span>}
                  </p>
                </div>

                {!isSelf && (
                  <form action={toggleUserDisabled.bind(null, s.id)}>
                    <button
                      type="submit"
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                        s.disabled
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "border border-rose-200 text-rose-600 hover:bg-rose-50"
                      }`}
                    >
                      {s.disabled ? "Enable" : "Disable"}
                    </button>
                  </form>
                )}
              </div>

              {/* Role + permissions editor */}
              <form
                action={updateStaffAccess.bind(null, s.id)}
                className="mt-4 border-t border-slate-100 pt-4"
              >
                <div className="flex flex-wrap items-center gap-4">
                  <label className="text-sm font-medium text-slate-700">
                    Role
                    <select
                      name="role"
                      defaultValue={s.role}
                      disabled={isSelf}
                      className="ml-2 rounded-lg border border-slate-200 px-2 py-1.5 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <option value="ADMIN">Staff</option>
                      <option value="SUPERADMIN">Superadmin</option>
                    </select>
                  </label>
                  {isSelf && (
                    <span className="text-xs text-slate-400">
                      You can&apos;t change your own role.
                    </span>
                  )}
                </div>

                <fieldset className="mt-3">
                  <legend className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Sections this staff member can access
                  </legend>
                  <p className="mt-1 text-xs text-slate-400">
                    Ignored for superadmins (they have full access, including Settings).
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {GRANTABLE_SECTIONS.map((sec) => (
                      <label key={sec.key} className="flex items-center gap-1.5 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          name="permissions"
                          value={sec.key}
                          defaultChecked={s.permissions.includes(sec.key)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        {sec.label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <button
                  type="submit"
                  className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Save access
                </button>
              </form>
            </div>
          );
        })}
      </div>

      {/* Add staff */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-base font-semibold text-slate-900">Add staff member</h3>
        {state.error && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {state.error}
          </div>
        )}
        <form action={formAction} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Name
              <input name="name" required className={inputClass} />
              {state.fieldErrors?.name && (
                <span className="mt-1 block text-xs text-rose-600">{state.fieldErrors.name}</span>
              )}
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Email
              <input name="email" type="email" required className={inputClass} />
              {state.fieldErrors?.email && (
                <span className="mt-1 block text-xs text-rose-600">{state.fieldErrors.email}</span>
              )}
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Temporary password
              <input name="password" type="password" required className={inputClass} />
              {state.fieldErrors?.password && (
                <span className="mt-1 block text-xs text-rose-600">
                  {state.fieldErrors.password}
                </span>
              )}
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Role
              <select name="role" defaultValue="ADMIN" className={inputClass}>
                <option value="ADMIN">Staff</option>
                <option value="SUPERADMIN">Superadmin</option>
              </select>
            </label>
          </div>

          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Sections (for staff)
            </legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {GRANTABLE_SECTIONS.map((sec) => (
                <label key={sec.key} className="flex items-center gap-1.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="permissions"
                    value={sec.key}
                    defaultChecked={sec.key === "dashboard"}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  {sec.label}
                </label>
              ))}
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {pending ? "Adding…" : "Add staff member"}
          </button>
        </form>
      </div>
    </div>
  );
}
