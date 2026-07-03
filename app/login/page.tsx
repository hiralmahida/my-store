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

// Accept only same-origin relative return paths.
function sanitize(next?: string): string | undefined {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = sanitize((await searchParams).next);

  // Already signed in? Skip the form (and honor the return path).
  if (await getCurrentUser()) redirect(next ?? "/account");

  const registerHref = next ? `/register?next=${encodeURIComponent(next)}` : "/register";

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sign in</h1>
      <p className="mt-1 text-sm text-slate-500">
        {next === "/checkout"
          ? "Please sign in to complete your order."
          : "Welcome back. Sign in to your FirstStop account."}
      </p>

      <div className="mt-8 rounded-2xl border border-slate-200 p-6">
        <LoginForm next={next} />
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        New to FirstStop?{" "}
        <Link href={registerHref} className="font-medium text-blue-600 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
