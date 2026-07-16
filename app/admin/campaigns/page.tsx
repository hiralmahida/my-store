// Admin email campaigns: /admin/campaigns
// Campaign list with engagement metrics, plus draft/schedule/send lifecycle.
// Backed by the typed mock store in src/lib/campaigns.ts.

import type { Metadata } from "next";
import Link from "next/link";
import { listCampaigns, getCampaignMetrics, audienceLabel } from "@/src/lib/campaigns";
import { DataTable, Thead, Th, Tbody } from "../_components/DataTable";
import StatusBadge from "../_components/StatusBadge";
import StatCard from "../_components/StatCard";
import EmptyState from "../_components/EmptyState";
import { sendCampaignAction, deleteCampaignAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Campaigns — FirstStop Admin" };

const FLASH: Record<string, string> = {
  "campaign-created": "Campaign created.",
  "campaign-updated": "Campaign updated.",
  "campaign-deleted": "Campaign deleted.",
};

function rate(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—";
}

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ flash?: string }>;
}) {
  const { flash } = await searchParams;
  const [campaigns, metrics] = await Promise.all([listCampaigns(), getCampaignMetrics()]);

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Email campaigns</h1>
          <p className="mt-1 text-sm text-slate-500">Plan, schedule and send campaigns to customer segments.</p>
        </div>
        <Link
          href="/admin/campaigns/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          New campaign
        </Link>
      </div>

      {flash && FLASH[flash] && (
        <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
          {FLASH[flash]}
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Campaigns" value={String(metrics.total)} hint={`${metrics.draft} drafts`} />
        <StatCard label="Sent" value={String(metrics.sent)} />
        <StatCard label="Scheduled" value={String(metrics.scheduled)} accent="text-blue-600" />
        <StatCard label="Avg. open rate" value={`${metrics.avgOpenRate}%`} accent="text-green-600" hint="sent campaigns" />
      </div>

      {campaigns.length === 0 ? (
        <EmptyState
          title="No campaigns yet"
          description="Create your first email campaign to reach customers."
          actionLabel="New campaign"
          actionHref="/admin/campaigns/new"
        />
      ) : (
        <DataTable>
          <Thead>
            <tr>
              <Th>Campaign</Th>
              <Th>Audience</Th>
              <Th>Status</Th>
              <Th className="text-right">Recipients</Th>
              <Th className="text-right">Open rate</Th>
              <Th className="text-right">Click rate</Th>
              <Th>When</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {campaigns.map((c) => {
              const editable = c.status !== "SENT";
              return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/campaigns/${c.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                      {c.name}
                    </Link>
                    <span className="mt-0.5 block max-w-xs truncate text-xs text-slate-400">{c.subject}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{audienceLabel(c.audience)}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {c.recipients ? c.recipients.toLocaleString("en-US") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{rate(c.opens, c.recipients)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{rate(c.clicks, c.recipients)}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {c.status === "SENT" && c.sentAt
                      ? new Date(c.sentAt).toLocaleDateString("en-GB")
                      : c.status === "SCHEDULED" && c.scheduledAt
                        ? `Scheduled ${new Date(c.scheduledAt).toLocaleDateString("en-GB")}`
                        : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {editable && (
                        <>
                          <form action={sendCampaignAction.bind(null, c.id)}>
                            <button type="submit" className="font-medium text-blue-600 hover:underline">
                              Send
                            </button>
                          </form>
                          <Link href={`/admin/campaigns/${c.id}`} className="font-medium text-slate-600 hover:underline">
                            Edit
                          </Link>
                        </>
                      )}
                      <form action={deleteCampaignAction.bind(null, c.id)}>
                        <button type="submit" className="font-medium text-rose-600 hover:underline">
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </Tbody>
        </DataTable>
      )}
    </div>
  );
}
