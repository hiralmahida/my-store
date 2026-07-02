// Site header: reusable across every page (rendered once in the root layout).
//
// It contains four things the brief asks for:
//   1. A store-name logo placeholder
//   2. A categories navigation bar
//   3. A search input (visual only for now — no results page yet)
//   4. A cart icon placeholder
//
// This is a presentational Server Component (no client-side state yet), so it
// ships zero JavaScript to the browser. The category list is a static array
// for Phase 1; a later phase can make it data-driven from the database.

import Link from "next/link";

// Top-level categories shown in the nav. `slug` matches the seeded categories,
// so these links will point at real category pages once those are built.
const NAV_CATEGORIES: { name: string; slug: string }[] = [
  { name: "Mobile Phones", slug: "mobile-phones" },
  { name: "Laptops", slug: "laptops" },
  { name: "Tablets", slug: "tablets" },
  { name: "Smart Watches", slug: "smart-watches" },
  { name: "Audio", slug: "audio" },
  { name: "Smart Home", slug: "smart-home" },
  { name: "Gaming", slug: "gaming" },
  { name: "Accessories", slug: "accessories" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      {/* Top row: logo, search, cart */}
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo placeholder — a simple mark + wordmark */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            V
          </span>
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            Volt<span className="text-blue-600">Electronics</span>
          </span>
        </Link>

        {/* Search — a plain form for now. It submits to /search (not built yet),
            so it degrades gracefully instead of throwing. */}
        <form
          action="/search"
          className="relative hidden flex-1 items-center md:flex"
        >
          <SearchIcon className="pointer-events-none absolute left-3 h-5 w-5 text-slate-400" />
          <input
            type="search"
            name="q"
            placeholder="Search for phones, laptops, audio…"
            aria-label="Search products"
            className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />
        </form>

        {/* Cart icon placeholder — a link with a static item-count badge. */}
        <Link
          href="/cart"
          aria-label="Cart"
          className="relative ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100 md:ml-0"
        >
          <CartIcon className="h-6 w-6" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold text-white">
            0
          </span>
        </Link>
      </div>

      {/* Second row: categories nav. Scrolls horizontally on small screens. */}
      <nav className="border-t border-slate-100 bg-white">
        <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 py-1 sm:px-4 lg:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV_CATEGORIES.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/category/${category.slug}`}
                className="block whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

// --- Inline SVG icons (no icon library needed) -----------------------------

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function CartIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}
