// Gates every /admin/campaigns/* page behind the "campaigns" section
// permission (Marketing).

import { requireSection } from "@/src/lib/require-section";

export const dynamic = "force-dynamic";

export default async function CampaignsSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSection("campaigns");
  return <>{children}</>;
}
