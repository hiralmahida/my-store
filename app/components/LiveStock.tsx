// Live stock badge. Subscribes to the SSE stream and updates the displayed
// stock the moment it changes anywhere (e.g. someone else buys the last unit).
//
// Client Component: opens an EventSource to /api/events and filters for stock
// events matching this product. Starts from the server-rendered `initialStock`
// so there's no flicker and it works even before the stream connects.

"use client";

import { useEffect, useState } from "react";

export default function LiveStock({
  productId,
  initialStock,
}: {
  productId: string;
  initialStock: number;
}) {
  const [stock, setStock] = useState(initialStock);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const source = new EventSource("/api/events");

    source.onopen = () => setLive(true);
    source.onerror = () => setLive(false); // browser auto-reconnects

    source.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === "stock" && event.productId === productId) {
          setStock(event.stock);
        }
      } catch {
        // ignore malformed frames (e.g. heartbeats aren't JSON `data:` lines)
      }
    };

    return () => source.close();
  }, [productId]);

  const badge =
    stock <= 0
      ? { text: "Out of stock", className: "bg-slate-100 text-slate-500" }
      : stock <= 5
        ? { text: `Only ${stock} left`, className: "bg-amber-100 text-amber-800" }
        : { text: `In stock (${stock} available)`, className: "bg-green-100 text-green-800" };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}
      title={live ? "Live — updates in real time" : "Reconnecting…"}
    >
      {/* A small pulse dot signals the live connection. */}
      <span
        className={`h-1.5 w-1.5 rounded-full ${live ? "animate-pulse bg-current" : "bg-slate-300"}`}
        aria-hidden="true"
      />
      {badge.text}
    </span>
  );
}
