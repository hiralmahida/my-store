// Gates every /admin/categories/* page behind the "products" section
// permission — categories are part of catalog management.

import { requireSection } from "@/src/lib/require-section";

export const dynamic = "force-dynamic";

export default async function CategoriesSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSection("products");
  return <>{children}</>;
}
