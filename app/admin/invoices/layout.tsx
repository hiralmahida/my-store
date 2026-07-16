// Gates every /admin/invoices/* page behind the "transactions" section
// permission (Sales & Payments).

import { requireSection } from "@/src/lib/require-section";

export const dynamic = "force-dynamic";

export default async function InvoicesSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSection("transactions");
  return <>{children}</>;
}
