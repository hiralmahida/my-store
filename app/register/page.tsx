// Registration page: /register

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/app/components/AuthForms";
import { getCurrentUser } from "@/src/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create account — FirstStop",
  description: "Create a FirstStop account to check out faster and track orders.",
};

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/account");

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Create your account
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Save your cart, check out faster, and track your orders.
      </p>

      <div className="mt-8 rounded-2xl border border-slate-200 p-6">
        <RegisterForm />
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
