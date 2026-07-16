// Gates every /admin/transactions/* page behind the "transactions" section
// permission (Sales & Payments).

import { requireSection } from "@/src/lib/require-section";

export const dynamic = "force-dynamic";

export default async function TransactionsSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSection("transactions");
  return <>{children}</>;
}
