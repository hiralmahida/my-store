// Server-Sent Events endpoint: GET /api/events
//
// Streams real-time events (stock changes, order status, admin notifications)
// from the in-process bus to the browser. Clients connect with the native
// EventSource API; each event arrives as a JSON `data:` line. See the live
// components (LiveStock, LiveOrderStatus) for the consumer side.

import type { NextRequest } from "next/server";
import { subscribe, type RealtimeEvent } from "@/src/lib/events";

// Never cache; must run on the Node.js runtime (uses the EventEmitter bus).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      // Open the stream with a comment so the client's connection settles.
      safeEnqueue(": connected\n\n");

      // Forward every bus event as an SSE `data:` message.
      const unsubscribe = subscribe((event: RealtimeEvent) => {
        safeEnqueue(`data: ${JSON.stringify(event)}\n\n`);
      });

      // Heartbeat keeps the connection alive through idle-timeout proxies.
      const heartbeat = setInterval(() => safeEnqueue(": ping\n\n"), 25000);

      // Clean up when the client disconnects.
      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };
      request.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
