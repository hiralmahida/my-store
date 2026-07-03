import type { Metadata } from "next";
import ContactForm from "@/app/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact Us — FirstStop",
  description: "Get in touch with the FirstStop team in Doha, Qatar.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Contact Us</h1>
      <p className="mt-2 text-slate-500">
        Questions about an order, a product, or delivery? We&apos;re here to help.
      </p>

      <div className="mt-8 grid gap-10 md:grid-cols-[1fr_1.2fr]">
        {/* Details */}
        <div className="space-y-6 text-sm text-slate-600">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Head office</h2>
            <p className="mt-1">
              FirstStop Electronics
              <br />
              Building 24, Salwa Road
              <br />
              Al Sadd, Doha, Qatar
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Phone</h2>
            <p className="mt-1">
              <a href="tel:+97444000000" className="text-blue-600 hover:underline">
                +974 4400 0000
              </a>
              <br />
              Sun–Thu, 9:00–18:00
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Email</h2>
            <p className="mt-1">
              <a href="mailto:support@firststop.qa" className="text-blue-600 hover:underline">
                support@firststop.qa
              </a>
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-slate-200 p-6">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
