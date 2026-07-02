// Loading skeleton for the account page.

export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 h-8 w-48 rounded bg-slate-200" />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-48 rounded-2xl bg-slate-200" />
        <div className="h-48 rounded-2xl bg-slate-200" />
      </div>
      <div className="mt-6 h-40 rounded-2xl bg-slate-200" />
    </div>
  );
}
