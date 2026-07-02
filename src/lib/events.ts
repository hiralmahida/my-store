// Real-time event bus.
//
// A single in-process pub/sub built on Node's EventEmitter. Producers (e.g. the
// checkout action) publish events; the SSE endpoint (app/api/events) subscribes
// and streams them to connected browsers.
//
// SCOPE / TRADE-OFF: this bus is per-process, so it works in a single-instance
// deployment (next dev, `next start`, a single Docker container). For a
// multi-instance or serverless deployment, swap this for Redis (or similar)
// pub/sub behind the SAME publish/subscribe API — the rest of the app doesn't
// change. This mirrors how payments hide behind a swappable provider.
//
// It's cached on globalThis so dev hot-reloads reuse one bus (like the Prisma
// client), otherwise each reload would create a new, disconnected emitter.

import { EventEmitter } from "node:events";

// --- Event types ------------------------------------------------------------

/** A product's stock level changed (e.g. after a purchase or admin edit). */
export interface StockEvent {
  type: "stock";
  productId: string;
  stock: number;
}

/** An order's status changed (e.g. pending → shipped). */
export interface OrderEvent {
  type: "order";
  orderId: string;
  status: string;
}

/** An alert for the admin notifications feed (new order, low stock, …). */
export interface AdminNotification {
  type: "notification";
  kind: "new-order" | "low-stock";
  message: string;
  at: string; // ISO timestamp
  meta?: Record<string, unknown>;
}

export type RealtimeEvent = StockEvent | OrderEvent | AdminNotification;

// --- The bus ----------------------------------------------------------------

const CHANNEL = "realtime";

const globalForBus = globalThis as unknown as { __realtimeBus?: EventEmitter };
const bus = globalForBus.__realtimeBus ?? new EventEmitter();
// Each connected SSE client adds a listener; lift the default cap of 10.
bus.setMaxListeners(0);
if (!globalForBus.__realtimeBus) globalForBus.__realtimeBus = bus;

/** Publish an event to all subscribers. */
export function publishEvent(event: RealtimeEvent): void {
  bus.emit(CHANNEL, event);
}

/** Subscribe to all events. Returns an unsubscribe function. */
export function subscribe(listener: (event: RealtimeEvent) => void): () => void {
  bus.on(CHANNEL, listener);
  return () => {
    bus.off(CHANNEL, listener);
  };
}

// --- Convenience publishers -------------------------------------------------

export function publishStockChange(productId: string, stock: number): void {
  publishEvent({ type: "stock", productId, stock });
}

export function publishOrderStatus(orderId: string, status: string): void {
  publishEvent({ type: "order", orderId, status });
}

export function publishAdminNotification(
  notification: Omit<AdminNotification, "type">
): void {
  publishEvent({ type: "notification", ...notification });
}
