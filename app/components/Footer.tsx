// Site footer: reusable, rendered once in the root layout.
// Presentational Server Component — plain links and copy, no interactivity.

import Link from "next/link";

// Grouped footer links. Most point at pages that don't exist yet; they're
// placeholders that establish the information architecture for later phases.
const FOOTER_SECTIONS: { title: string; links: { label: string; href: string }[] }[] =
  [
    {
      title: "Shop",
      links: [
        { label: "Mobile Phones", href: "/category/mobile-phones" },
        { label: "Laptops", href: "/category/laptops" },
        { label: "Audio", href: "/category/audio" },
        { label: "Gaming", href: "/category/gaming" },
      ],
    },
    {
      title: "Support",
      links: [
        { label: "Contact Us", href: "/contact" },
        { label: "Shipping & Delivery", href: "/shipping" },
        { label: "Returns", href: "/returns" },
        { label: "Warranty", href: "/warranty" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "/about" },
        { label: "Stores in Qatar", href: "/stores" },
        { label: "Careers", href: "/careers" },
        { label: "Privacy Policy", href: "/privacy" },
      ],
    },
  ];

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {/* Brand blurb */}
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
                V
              </span>
              <span className="text-base font-semibold text-slate-900">
                Volt<span className="text-blue-600">Electronics</span>
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-slate-500">
              Qatar&apos;s destination for the latest electronics. Prices in QAR.
            </p>
          </div>

          {/* Link columns */}
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-slate-900">
                {section.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-500 transition hover:text-slate-900"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-400">
          © {new Date().getFullYear()} VoltElectronics. Sample project — not a
          real store.
        </div>
      </div>
    </footer>
  );
}
