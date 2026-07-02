// Live admin notifications feed. Renders recent persisted notifications and
// prepends new ones in real time as they arrive over the SSE stream.

"use client";

import { useEffect, useState } from "react";

export interface FeedItem {
  id: string;
  kind: string; // "NEW_ORDER" | "LOW_STOCK" (stored) or "new-order" | "low-stock" (live)
  message: string;
  at: string; // ISO timestamp
}

function isOrder(kind: string): boolean {
  return kind === "NEW_ORDER" || kind === "new-order";
}

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AdminNotificationsFeed({ initial }: { initial: FeedItem[] }) {
  const [items, setItems] = useState<FeedItem[]>(initial);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const source = new EventSource("/api/events");
    source.onopen = () => setLive(true);
    source.onerror = () => setLive(false);
    source.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type !== "notification") return;
        setItems((prev) =>
          [
            { id: `${event.at}-${Math.random().toString(36).slice(2, 7)}`, kind: event.kind, message: event.message, at: event.at },
            ...prev,
          ].slice(0, 30)
        );
      } catch {
        // ignore heartbeats / malformed frames
      }
    };
    return () => source.close();
  }, []);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
        <span className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className={`h-1.5 w-1.5 rounded-full ${live ? "animate-pulse bg-green-500" : "bg-slate-300"}`} />
          {live ? "Live" : "Offline"}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
          No notifications yet. Place an order to see one appear here live.
        </p>
      ) : (
        <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white p-3"
            >
              <span
                className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                  isOrder(item.kind)
                    ? "bg-blue-100 text-blue-700"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {isOrder(item.kind) ? "Order" : "Stock"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-700">{item.message}</p>
                <p className="text-xs text-slate-400">{timeAgo(item.at)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
