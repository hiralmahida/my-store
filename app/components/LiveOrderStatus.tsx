// Live order-status pill. Subscribes to the SSE stream and updates when this
// order's status changes (e.g. an admin marks it shipped) — no page refresh.
//
// Client Component. Starts from the server-rendered `initialStatus`; the admin
// panel (next phase) is the producer of status changes, which this reflects
// live for the customer.

"use client";

import { useEffect, useState } from "react";

// Order status → pill styling.
const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  PAID: "bg-blue-100 text-blue-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-rose-100 text-rose-700",
};

function label(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default function LiveOrderStatus({
  orderId,
  initialStatus,
}: {
  orderId: string;
  initialStatus: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const source = new EventSource("/api/events");
    source.onopen = () => setLive(true);
    source.onerror = () => setLive(false);
    source.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === "order" && event.orderId === orderId) {
          setStatus(event.status);
        }
      } catch {
        // ignore non-JSON heartbeats
      }
    };
    return () => source.close();
  }, [orderId]);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        STATUS_STYLES[status] ?? "bg-slate-100 text-slate-700"
      }`}
      title={live ? "Live — updates in real time" : "Reconnecting…"}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${live ? "animate-pulse bg-current" : "bg-slate-300"}`}
        aria-hidden="true"
      />
      {label(status)}
    </span>
  );
}
