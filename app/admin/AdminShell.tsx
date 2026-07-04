// Shopify-style admin shell: a collapsible dark left sidebar + a top bar with
// global search, the signed-in admin, and a "Back to store" link. Client
// component so it can manage the collapsed/mobile-drawer state and highlight
// the active nav item. The page content is passed in as `children`.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/auth/actions";

/* --- Icons (inline, no library) — defined before NAV that references them --- */
function svg(path: React.ReactNode) {
  return function Icon({ className }: { className?: string }) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {path}
      </svg>
    );
  };
}
const IconHome = svg(<><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></>);
const IconBag = svg(<><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></>);
const IconTag = svg(<><path d="M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" /><circle cx="7.5" cy="7.5" r="1.5" /></>);
const IconBoxes = svg(<><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 7v10l9 4 9-4V7" /><path d="M12 11v10" /></>);
const IconUsers = svg(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /></>);
const IconTicket = svg(<><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4z" /><path d="M13 7v10" /></>);
const IconCog = svg(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.31.4.55.72.66" /></>);
const IconStore = svg(<><path d="M3 9l1-5h16l1 5" /><path d="M4 9v11h16V9" /><path d="M3 9h18" /><path d="M9 20v-6h6v6" /></>);
const IconLogout = svg(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>);
const IconChevron = svg(<path d="M9 18l6-6-6-6" />);
const IconMenu = svg(<><path d="M3 12h18" /><path d="M3 6h18" /><path d="M3 18h18" /></>);
const IconSearch = svg(<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>);

const NAV: { href: string; label: string; icon: (p: { className?: string }) => React.ReactNode; exact?: boolean }[] = [
  { href: "/admin", label: "Dashboard", icon: IconHome, exact: true },
  { href: "/admin/orders", label: "Orders", icon: IconBag },
  { href: "/admin/products", label: "Products", icon: IconTag },
  { href: "/admin/inventory", label: "Inventory", icon: IconBoxes },
  { href: "/admin/customers", label: "Customers", icon: IconUsers },
  { href: "/admin/discounts", label: "Discounts", icon: IconTicket },
  { href: "/admin/settings", label: "Settings", icon: IconCog },
];

export default function AdminShell({
  userName,
  children,
}: {
  userName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/") || pathname === href;

  const sidebarWidth = collapsed ? "lg:w-16" : "lg:w-60";

  const navList = (
    <nav className="flex-1 space-y-1 px-3">
      {NAV.map(({ href, label, icon: Icon, exact }) => {
        const active = isActive(href, exact);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            title={collapsed ? label : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              active ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className={collapsed ? "lg:hidden" : ""}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );

  const sidebarInner = (
    <div className="flex h-full flex-col py-4">
      <Link
        href="/admin"
        onClick={() => setMobileOpen(false)}
        className="mb-6 flex items-center gap-2 px-5"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
          F
        </span>
        <span className={`text-base font-semibold text-white ${collapsed ? "lg:hidden" : ""}`}>
          First<span className="text-blue-400">Stop</span>
        </span>
      </Link>

      {navList}

      <div className="mt-auto space-y-1 border-t border-slate-800 px-3 pt-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
          title={collapsed ? "Back to store" : undefined}
        >
          <IconStore className="h-5 w-5 shrink-0" />
          <span className={collapsed ? "lg:hidden" : ""}>Back to store</span>
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
            title={collapsed ? "Sign out" : undefined}
          >
            <IconLogout className="h-5 w-5 shrink-0" />
            <span className={collapsed ? "lg:hidden" : ""}>Sign out</span>
          </button>
        </form>
        {/* Collapse toggle (desktop only) */}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="hidden w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white lg:flex"
        >
          <IconChevron className={`h-5 w-5 shrink-0 transition ${collapsed ? "" : "rotate-180"}`} />
          <span className={collapsed ? "lg:hidden" : ""}>Collapse</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden shrink-0 bg-slate-900 transition-all lg:block print:hidden ${sidebarWidth}`}
      >
        {sidebarInner}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-60 bg-slate-900 lg:hidden">
            {sidebarInner}
          </aside>
        </>
      )}

      {/* Main column (offset by the sidebar width on desktop) */}
      <div className={`flex min-h-screen flex-col transition-all print:!pl-0 ${collapsed ? "lg:pl-16" : "lg:pl-60"}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur print:hidden sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <IconMenu className="h-5 w-5" />
          </button>

          <form action="/admin/search" className="relative flex max-w-md flex-1 items-center">
            <IconSearch className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
            <input
              type="search"
              name="q"
              placeholder="Search orders, products, customers…"
              aria-label="Search admin"
              className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </form>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-sm text-slate-500 sm:inline">
              {userName}
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
        </header>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
