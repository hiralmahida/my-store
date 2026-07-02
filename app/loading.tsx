// Global loading fallback (home + any route without its own loading.tsx).
// Shown instantly during navigation while the server renders the page.

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-12 h-56 rounded-2xl bg-slate-200" />
      <div className="mb-6 h-6 w-48 rounded bg-slate-200" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-slate-200">
            <div className="aspect-square bg-slate-200" />
            <div className="space-y-2 p-4">
              <div className="h-3 w-16 rounded bg-slate-200" />
              <div className="h-4 w-full rounded bg-slate-200" />
              <div className="h-4 w-20 rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
