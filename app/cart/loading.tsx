// Loading skeleton for the cart page.

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 h-8 w-40 rounded bg-slate-200" />
      <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4 border-b border-slate-100 pb-5">
              <div className="h-24 w-24 shrink-0 rounded-lg bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-16 rounded bg-slate-200" />
                <div className="h-4 w-2/3 rounded bg-slate-200" />
                <div className="h-8 w-28 rounded bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}
