// Shared status badge for the admin panel (order/payment statuses, etc.).
// A plain server component — used across dashboard, orders and detail pages.

const STYLES: Record<string, string> = {
  // Order statuses
  PENDING: "bg-amber-100 text-amber-800",
  PAID: "bg-blue-100 text-blue-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-rose-100 text-rose-700",
  REFUNDED: "bg-slate-200 text-slate-700",
  // Payment statuses
  SUCCEEDED: "bg-green-100 text-green-800",
  FAILED: "bg-rose-100 text-rose-700",
  // Generic
  ACTIVE: "bg-green-100 text-green-800",
  DISABLED: "bg-rose-100 text-rose-700",
  DRAFT: "bg-slate-200 text-slate-700",
  ARCHIVED: "bg-slate-200 text-slate-500",
  // Campaign statuses
  SCHEDULED: "bg-blue-100 text-blue-800",
  SENT: "bg-green-100 text-green-800",
};

function label(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default function StatusBadge({
  status,
  raw = false,
}: {
  status: string;
  /** show the exact string instead of Title-casing it */
  raw?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        STYLES[status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {raw ? status : label(status)}
    </span>
  );
}
