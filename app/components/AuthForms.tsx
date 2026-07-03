// Client-side auth forms. Each uses React's useActionState to call a server
// action and render inline field/top-level errors (and a success message for
// the change-password form). On success, register/login redirect server-side.

"use client";

import { useActionState } from "react";
import { login, register, changePassword, type AuthFormState } from "@/app/auth/actions";

const INITIAL: AuthFormState = {};

// A labeled input with an optional error message beneath it.
function Field({
  label,
  name,
  type = "text",
  autoComplete,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        aria-invalid={error ? true : undefined}
        className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 ${
          error
            ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
            : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
        }`}
      />
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function TopError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
      {message}
    </p>
  );
}

function SubmitButton({ pending, label, pendingLabel }: { pending: boolean; label: string; pendingLabel: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(login, INITIAL);
  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <TopError message={state.error} />
      <Field label="Email" name="email" type="email" autoComplete="email" error={state.fieldErrors?.email} />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        error={state.fieldErrors?.password}
      />
      <SubmitButton pending={pending} label="Sign in" pendingLabel="Signing in…" />
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(register, INITIAL);
  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <TopError message={state.error} />
      <Field label="Full name" name="name" autoComplete="name" error={state.fieldErrors?.name} />
      <Field label="Email" name="email" type="email" autoComplete="email" error={state.fieldErrors?.email} />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        error={state.fieldErrors?.password}
      />
      <SubmitButton pending={pending} label="Create account" pendingLabel="Creating…" />
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, INITIAL);
  return (
    <form action={formAction} className="space-y-4">
      {state.success && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700" role="status">
          {state.success}
        </p>
      )}
      <TopError message={state.error} />
      <Field
        label="Current password"
        name="current"
        type="password"
        autoComplete="current-password"
        error={state.fieldErrors?.current}
      />
      <Field
        label="New password"
        name="next"
        type="password"
        autoComplete="new-password"
        error={state.fieldErrors?.next}
      />
      <SubmitButton pending={pending} label="Update password" pendingLabel="Updating…" />
    </form>
  );
}
