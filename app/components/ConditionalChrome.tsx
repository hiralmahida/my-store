// Decides whether to show the storefront chrome (Header/Footer) around the
// page. Admin routes (/admin/*) get a clean, full-height shell instead, since
// they render their own sidebar layout.
//
// Client Component so it can read the pathname. The Header/Footer are passed in
// as already-rendered Server Components, so no store data-fetching leaks into
// the client bundle.

"use client";

import { usePathname } from "next/navigation";

export default function ConditionalChrome({
  banner,
  header,
  footer,
  children,
}: {
  banner: React.ReactNode;
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      {banner}
      {header}
      <main className="flex-1">{children}</main>
      {footer}
    </>
  );
}
