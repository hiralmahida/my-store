// Gates every /admin/inventory/* page behind the "inventory" section permission.

import { requireSection } from "@/src/lib/require-section";

export const dynamic = "force-dynamic";

export default async function InventorySectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSection("inventory");
  return <>{children}</>;
}
