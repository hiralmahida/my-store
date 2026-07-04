// CSV export of orders: GET /admin/orders/export?view=&q=&sort=&dir=  (filtered)
// or /admin/orders/export?ids=a,b,c  (specific selected orders). Admin only.

import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { getOrdersForExport } from "@/src/lib/admin";
import { prisma } from "@/src/lib/prisma";
import { withDbRetry } from "@/src/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function csvCell(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
    return new Response("Forbidden", { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const ids = sp.get("ids");

  const orders = ids
    ? await withDbRetry(() =>
        prisma.order.findMany({
          where: { id: { in: ids.split(",").filter(Boolean) } },
          include: { _count: { select: { items: true } }, payment: { select: { method: true } } },
          orderBy: { createdAt: "desc" },
        })
      )
    : await getOrdersForExport({
        view: sp.get("view") ?? undefined,
        q: sp.get("q") ?? undefined,
        sort: sp.get("sort") ?? undefined,
        dir: sp.get("dir") ?? undefined,
      });

  const header = ["Order", "Date", "Customer", "Email", "Items", "Total (QAR)", "Status", "Payment"];
  const lines = [header.map(csvCell).join(",")];
  for (const o of orders) {
    lines.push(
      [
        o.id.slice(-8).toUpperCase(),
        o.createdAt.toISOString().slice(0, 10),
        o.customerName,
        o.customerEmail,
        String(o._count.items),
        Number(o.total.toString()).toFixed(2),
        o.status,
        o.payment?.method ?? "",
      ]
        .map(csvCell)
        .join(",")
    );
  }

  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="firststop-orders.csv"`,
    },
  });
}
