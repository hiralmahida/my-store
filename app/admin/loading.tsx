// Loading skeleton for admin pages (renders inside the admin sidebar shell).

export default function Loading() {
  return (
    <div className="animate-pulse p-8">
      <div className="mb-6 h-8 w-48 rounded bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-200" />
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="h-72 rounded-2xl bg-slate-200 lg:col-span-2" />
        <div className="h-72 rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}
