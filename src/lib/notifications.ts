// Record an admin notification: persist it (so the dashboard shows history) and
// push it live over the event bus (so open dashboards update instantly).

import type { NotificationKind } from "@/app/generated/prisma/client";
import { prisma } from "@/src/lib/prisma";
import { withDbRetry } from "@/src/lib/db";
import { publishAdminNotification } from "@/src/lib/events";

export async function recordNotification(
  kind: NotificationKind,
  message: string,
  meta: Record<string, string | number> = {}
): Promise<void> {
  await withDbRetry(() =>
    prisma.notification.create({ data: { kind, message, meta } })
  );

  publishAdminNotification({
    kind: kind === "NEW_ORDER" ? "new-order" : "low-stock",
    message,
    at: new Date().toISOString(),
    meta,
  });
}
