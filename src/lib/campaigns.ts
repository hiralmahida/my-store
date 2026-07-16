// Email campaigns — a TYPED MOCK data layer.
//
// The store has no email/marketing backend, so campaigns live in an in-memory
// store seeded with realistic data. It's deliberately shaped like a real data
// access module (async functions returning plain objects) so swapping in a real
// API or Prisma model later is a one-file change: reimplement these functions
// and delete the seed. State persists for the life of the running server
// process (fine for a demo); it resets on restart.

export type CampaignStatus = "DRAFT" | "SCHEDULED" | "SENT";

export const CAMPAIGN_STATUSES: CampaignStatus[] = ["DRAFT", "SCHEDULED", "SENT"];

// Audience segments a campaign can target (mirrors the customer segments).
export const CAMPAIGN_AUDIENCES = [
  { key: "all", label: "All customers", size: 1840 },
  { key: "repeat", label: "Repeat buyers", size: 420 },
  { key: "high", label: "High spenders", size: 96 },
  { key: "new", label: "New this month", size: 210 },
] as const;

export type CampaignAudience = (typeof CAMPAIGN_AUDIENCES)[number]["key"];

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  audience: CampaignAudience;
  status: CampaignStatus;
  body: string;
  scheduledAt: string | null; // ISO date (yyyy-MM-dd) when SCHEDULED
  sentAt: string | null; // ISO datetime when SENT
  recipients: number; // audience size at send/schedule time
  opens: number; // engagement metrics (mock)
  clicks: number;
  createdAt: string; // ISO datetime
}

export interface CampaignInput {
  name: string;
  subject: string;
  audience: CampaignAudience;
  body: string;
  scheduledAt: string | null;
}

function audienceSize(key: string): number {
  return CAMPAIGN_AUDIENCES.find((a) => a.key === key)?.size ?? 0;
}

function isValidAudience(key: string): key is CampaignAudience {
  return CAMPAIGN_AUDIENCES.some((a) => a.key === key);
}

// --- In-memory seed ---------------------------------------------------------

let seq = 100;
function nextId(): string {
  seq += 1;
  return `cmp_${seq}`;
}

const store: Campaign[] = [
  {
    id: nextId(),
    name: "Summer Electronics Sale",
    subject: "☀️ Up to 30% off laptops & phones — this week only",
    audience: "all",
    status: "SENT",
    body: "Our biggest summer sale is here. Save up to 30% on top brands, plus free delivery on orders over QAR 500.",
    scheduledAt: null,
    sentAt: "2026-06-18T09:00:00.000Z",
    recipients: 1785,
    opens: 742,
    clicks: 231,
    createdAt: "2026-06-15T11:20:00.000Z",
  },
  {
    id: nextId(),
    name: "VIP Early Access",
    subject: "You're in early: new arrivals before anyone else",
    audience: "high",
    status: "SENT",
    body: "As one of our most valued customers, you get 48-hour early access to the new season lineup.",
    scheduledAt: null,
    sentAt: "2026-06-28T08:30:00.000Z",
    recipients: 94,
    opens: 71,
    clicks: 38,
    createdAt: "2026-06-25T14:05:00.000Z",
  },
  {
    id: nextId(),
    name: "Win-back: We miss you",
    subject: "Here's 15% off to welcome you back",
    audience: "repeat",
    status: "SCHEDULED",
    body: "It's been a while! Come back and enjoy 15% off your next order with code WELCOME15.",
    scheduledAt: "2026-07-20",
    sentAt: null,
    recipients: 420,
    opens: 0,
    clicks: 0,
    createdAt: "2026-07-08T10:00:00.000Z",
  },
  {
    id: nextId(),
    name: "August Newsletter",
    subject: "What's new this month at FirstStop",
    audience: "all",
    status: "DRAFT",
    body: "Draft newsletter covering new arrivals, buying guides and store updates for August.",
    scheduledAt: null,
    sentAt: null,
    recipients: 0,
    opens: 0,
    clicks: 0,
    createdAt: "2026-07-11T16:40:00.000Z",
  },
];

// --- Data access (swap these for a real backend) ----------------------------

/** All campaigns, newest first. */
export async function listCampaigns(): Promise<Campaign[]> {
  return [...store].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  return store.find((c) => c.id === id) ?? null;
}

export interface CampaignMetrics {
  total: number;
  sent: number;
  scheduled: number;
  draft: number;
  totalRecipients: number;
  avgOpenRate: number; // 0–100, across SENT campaigns
}

export async function getCampaignMetrics(): Promise<CampaignMetrics> {
  const sent = store.filter((c) => c.status === "SENT");
  const totalOpens = sent.reduce((s, c) => s + c.opens, 0);
  const totalReached = sent.reduce((s, c) => s + c.recipients, 0);
  return {
    total: store.length,
    sent: sent.length,
    scheduled: store.filter((c) => c.status === "SCHEDULED").length,
    draft: store.filter((c) => c.status === "DRAFT").length,
    totalRecipients: totalReached,
    avgOpenRate: totalReached > 0 ? Math.round((totalOpens / totalReached) * 100) : 0,
  };
}

/** Validate campaign form input. Returns field errors keyed by field name. */
export function validateCampaign(input: Partial<CampaignInput>): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.name || input.name.trim().length < 3) errors.name = "Enter a campaign name (min 3 characters).";
  if (!input.subject || input.subject.trim().length < 3) errors.subject = "Enter an email subject line.";
  if (!input.audience || !isValidAudience(input.audience)) errors.audience = "Choose an audience.";
  if (!input.body || input.body.trim().length < 10) errors.body = "Write a short message body (min 10 characters).";
  if (input.scheduledAt) {
    const d = new Date(input.scheduledAt);
    if (Number.isNaN(d.getTime())) errors.scheduledAt = "Enter a valid date.";
  }
  return errors;
}

/** Create a campaign. `action` controls status: draft, schedule or send now. */
export async function createCampaign(
  input: CampaignInput,
  action: "draft" | "schedule" | "send"
): Promise<Campaign> {
  const now = new Date();
  const size = audienceSize(input.audience);
  const status: CampaignStatus =
    action === "send" ? "SENT" : action === "schedule" && input.scheduledAt ? "SCHEDULED" : "DRAFT";

  // A SENT campaign gets plausible engagement metrics so the list looks alive.
  const opens = status === "SENT" ? Math.round(size * 0.42) : 0;
  const clicks = status === "SENT" ? Math.round(size * 0.13) : 0;

  const campaign: Campaign = {
    id: nextId(),
    name: input.name.trim(),
    subject: input.subject.trim(),
    audience: input.audience,
    status,
    body: input.body.trim(),
    scheduledAt: status === "SCHEDULED" ? input.scheduledAt : null,
    sentAt: status === "SENT" ? now.toISOString() : null,
    recipients: status === "DRAFT" ? 0 : size,
    opens,
    clicks,
    createdAt: now.toISOString(),
  };
  store.push(campaign);
  return campaign;
}

/** Update an existing campaign's editable fields (SENT campaigns are locked). */
export async function updateCampaign(id: string, input: CampaignInput): Promise<Campaign | null> {
  const campaign = store.find((c) => c.id === id);
  if (!campaign || campaign.status === "SENT") return null;

  campaign.name = input.name.trim();
  campaign.subject = input.subject.trim();
  campaign.audience = input.audience;
  campaign.body = input.body.trim();
  if (input.scheduledAt) {
    campaign.scheduledAt = input.scheduledAt;
    campaign.status = "SCHEDULED";
    campaign.recipients = audienceSize(input.audience);
  } else {
    campaign.scheduledAt = null;
    campaign.status = "DRAFT";
    campaign.recipients = 0;
  }
  return campaign;
}

/** Send a campaign now (from the list). Returns false if not found / already sent. */
export async function sendCampaign(id: string): Promise<boolean> {
  const campaign = store.find((c) => c.id === id);
  if (!campaign || campaign.status === "SENT") return false;
  const size = audienceSize(campaign.audience);
  campaign.status = "SENT";
  campaign.sentAt = new Date().toISOString();
  campaign.scheduledAt = null;
  campaign.recipients = size;
  campaign.opens = Math.round(size * 0.42);
  campaign.clicks = Math.round(size * 0.13);
  return true;
}

export async function deleteCampaign(id: string): Promise<boolean> {
  const i = store.findIndex((c) => c.id === id);
  if (i === -1) return false;
  store.splice(i, 1);
  return true;
}

export function audienceLabel(key: string): string {
  return CAMPAIGN_AUDIENCES.find((a) => a.key === key)?.label ?? key;
}
