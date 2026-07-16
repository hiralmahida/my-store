// Edit / view a campaign: /admin/campaigns/[id]
// Editable while DRAFT or SCHEDULED; once SENT it's shown read-only with its
// engagement metrics.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "../../_components/Breadcrumbs";
import StatusBadge from "../../_components/StatusBadge";
import StatCard from "../../_components/StatCard";
import CampaignForm from "../CampaignForm";
import { updateCampaignAction } from "../actions";
import { getCampaign, audienceLabel } from "@/src/lib/campaigns";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit campaign — FirstStop Admin" };

function rate(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—";
}

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) notFound();

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumbs
        items={[{ label: "Campaigns", href: "/admin/campaigns" }, { label: campaign.name }]}
      />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{campaign.name}</h1>
        <StatusBadge status={campaign.status} />
      </div>

      {campaign.status === "SENT" ? (
        <div className="max-w-2xl space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Recipients" value={campaign.recipients.toLocaleString("en-US")} />
            <StatCard label="Open rate" value={rate(campaign.opens, campaign.recipients)} accent="text-green-600" />
            <StatCard label="Click rate" value={rate(campaign.clicks, campaign.recipients)} accent="text-blue-600" />
          </div>
          <dl className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Subject</dt>
              <dd className="text-right font-medium text-slate-900">{campaign.subject}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Audience</dt>
              <dd className="text-right text-slate-700">{audienceLabel(campaign.audience)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Sent</dt>
              <dd className="text-right text-slate-700">
                {campaign.sentAt ? new Date(campaign.sentAt).toLocaleString("en-GB") : "—"}
              </dd>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <dt className="mb-1 text-slate-500">Message</dt>
              <dd className="whitespace-pre-wrap text-slate-700">{campaign.body}</dd>
            </div>
          </dl>
          <p className="text-sm text-slate-400">Sent campaigns cannot be edited.</p>
        </div>
      ) : (
        <CampaignForm
          action={updateCampaignAction.bind(null, campaign.id)}
          mode="edit"
          defaults={{
            name: campaign.name,
            subject: campaign.subject,
            audience: campaign.audience,
            body: campaign.body,
            scheduledAt: campaign.scheduledAt ?? "",
          }}
        />
      )}
    </div>
  );
}
