// Create campaign: /admin/campaigns/new

import type { Metadata } from "next";
import Breadcrumbs from "../../_components/Breadcrumbs";
import CampaignForm from "../CampaignForm";
import { createCampaignAction } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New campaign — FirstStop Admin" };

export default function NewCampaignPage() {
  return (
    <div className="p-6 sm:p-8">
      <Breadcrumbs
        items={[{ label: "Campaigns", href: "/admin/campaigns" }, { label: "New" }]}
      />
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">New campaign</h1>
      <CampaignForm action={createCampaignAction} mode="create" />
    </div>
  );
}
