// Sign-in page: /login

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/app/components/AuthForms";
import { getCurrentUser } from "@/src/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in — FirstStop",
  description: "Sign in to your FirstStop account.",
};

export default async function LoginPage() {
  // Already signed in? Skip the form.
  if (await getCurrentUser()) redirect("/account");

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sign in</h1>
      <p className="mt-1 text-sm text-slate-500">
        Welcome back. Sign in to your FirstStop account.
      </p>

      <div className="mt-8 rounded-2xl border border-slate-200 p-6">
        <LoginForm />
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        New to FirstStop?{" "}
        <Link href="/register" className="font-medium text-blue-600 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
