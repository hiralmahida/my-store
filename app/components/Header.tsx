// Site header: reusable across every page (rendered once in the root layout).
//
// It contains:
//   1. The FirstStop wordmark/logo
//   2. A category navigation bar (now data-driven from the database)
//   3. A search box that submits to /search
//   4. A cart icon (cart is built in a later phase)
//
// This is an async Server Component: it queries the categories on the server so
// the nav always matches the seeded catalog, and ships zero JavaScript to the
// browser. If the database is temporarily unavailable, it falls back to a
// static category list so the site chrome still renders.

import Link from "next/link";
import { getCategories, type CategoryOption } from "@/src/lib/products";

// Fallback nav shown if the categories query fails (e.g. DB not seeded yet).
const FALLBACK_CATEGORIES: Pick<CategoryOption, "name" | "slug">[] = [
  { name: "Phones", slug: "phones" },
  { name: "Laptops", slug: "laptops" },
  { name: "Tablets", slug: "tablets" },
  { name: "TVs", slug: "tvs" },
  { name: "Home Appliances", slug: "appliances" },
  { name: "Accessories", slug: "accessories" },
];

export default async function Header() {
  // Data-driven nav. Guard against DB errors so the header never crashes a page.
  let categories: Pick<CategoryOption, "name" | "slug">[];
  try {
    const fromDb = await getCategories();
    categories = fromDb.length > 0 ? fromDb : FALLBACK_CATEGORIES;
  } catch {
    categories = FALLBACK_CATEGORIES;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      {/* Top row: logo, search, cart */}
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            F
          </span>
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            First<span className="text-blue-600">Stop</span>
          </span>
        </Link>

        {/* Search — submits to /search via GET, so it works without JS. */}
        <form
          action="/search"
          className="relative hidden flex-1 items-center md:flex"
        >
          <SearchIcon className="pointer-events-none absolute left-3 h-5 w-5 text-slate-400" />
          <input
            type="search"
            name="q"
            placeholder="Search for phones, laptops, TVs…"
            aria-label="Search products"
            className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />
        </form>

        {/* Cart icon (cart is a later phase). */}
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
          <li>
            <Link
              href="/products"
              className="block whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              All
            </Link>
          </li>
          {categories.map((category) => (
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
