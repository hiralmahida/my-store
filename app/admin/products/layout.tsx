// Gates every /admin/products/* page behind the "products" section permission.

import { requireSection } from "@/src/lib/require-section";

export const dynamic = "force-dynamic";

export default async function ProductsSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSection("products");
  return <>{children}</>;
}
