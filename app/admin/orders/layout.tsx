// Gates every /admin/orders/* page behind the "orders" section permission.
// (Staff without it are redirected to /admin by requireSection.)

import { requireSection } from "@/src/lib/require-section";

export const dynamic = "force-dynamic";

export default async function OrdersSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSection("orders");
  return <>{children}</>;
}
