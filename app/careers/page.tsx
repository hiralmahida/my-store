import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Careers — FirstStop",
  description: "Join the FirstStop team in Qatar.",
};

const OPENINGS = [
  { role: "Retail Sales Associate", location: "Al Sadd, Doha", type: "Full-time" },
  { role: "Delivery Driver", location: "Doha", type: "Full-time" },
  { role: "Customer Support Specialist", location: "Doha (Hybrid)", type: "Full-time" },
  { role: "E-commerce Merchandiser", location: "Doha", type: "Full-time" },
  { role: "Warehouse Coordinator", location: "Industrial Area, Doha", type: "Full-time" },
];

export default function CareersPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Careers at FirstStop</h1>
      <p className="mt-2 text-slate-500">
        We&apos;re growing across Qatar and always looking for people who love technology and
        great service.
      </p>

      <h2 className="mt-10 text-lg font-semibold text-slate-900">Current openings</h2>
      <ul className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200">
        {OPENINGS.map((job) => (
          <li key={job.role} className="flex flex-wrap items-center justify-between gap-2 p-4">
            <div>
              <p className="text-sm font-medium text-slate-900">{job.role}</p>
              <p className="text-xs text-slate-500">
                {job.location} · {job.type}
              </p>
            </div>
            <a
              href="mailto:careers@firststop.qa?subject=Application"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
            >
              Apply
            </a>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-sm text-slate-500">
        Don&apos;t see the right role? Send your CV to{" "}
        <a href="mailto:careers@firststop.qa" className="text-blue-600 hover:underline">
          careers@firststop.qa
        </a>{" "}
        and we&apos;ll keep you in mind.
      </p>
    </div>
  );
}
