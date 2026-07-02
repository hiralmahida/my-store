// Loading skeleton for the product detail page.

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 h-4 w-64 rounded bg-slate-200" />
      <div className="grid gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="aspect-square rounded-2xl bg-slate-200" />
          <div className="mt-3 grid grid-cols-5 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-lg bg-slate-200" />
            ))}
          </div>
        </div>
        {/* Info */}
        <div className="space-y-4">
          <div className="h-3 w-20 rounded bg-slate-200" />
          <div className="h-8 w-3/4 rounded bg-slate-200" />
          <div className="h-6 w-40 rounded bg-slate-200" />
          <div className="h-9 w-32 rounded bg-slate-200" />
          <div className="h-12 w-full max-w-sm rounded bg-slate-200" />
          <div className="space-y-2 pt-4">
            <div className="h-4 w-full rounded bg-slate-200" />
            <div className="h-4 w-5/6 rounded bg-slate-200" />
            <div className="h-4 w-2/3 rounded bg-slate-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
