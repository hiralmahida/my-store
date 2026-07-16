// Server Actions for email campaigns. Every action re-checks the admin role
// (defense in depth) and writes to the typed mock store in src/lib/campaigns.ts.

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/src/lib/auth";
import {
  createCampaign,
  updateCampaign,
  sendCampaign,
  deleteCampaign,
  validateCampaign,
  type CampaignInput,
} from "@/src/lib/campaigns";
import type { AdminActionState } from "@/app/admin/actions";

async function ensureAdmin() {
  return requireRole(["ADMIN", "SUPERADMIN"]);
}

function parseInput(formData: FormData): CampaignInput {
  return {
    name: String(formData.get("name") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    audience: String(formData.get("audience") ?? "all") as CampaignInput["audience"],
    body: String(formData.get("body") ?? ""),
    scheduledAt: String(formData.get("scheduledAt") ?? "").trim() || null,
  };
}

export async function createCampaignAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await ensureAdmin();
  const input = parseInput(formData);
  const fieldErrors = validateCampaign(input);

  // "schedule" requires a date; fall back to a clear field error.
  const intent = String(formData.get("intent") ?? "draft");
  if (intent === "schedule" && !input.scheduledAt) {
    fieldErrors.scheduledAt = "Pick a date to schedule the send.";
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const action = intent === "send" ? "send" : intent === "schedule" ? "schedule" : "draft";
  await createCampaign(input, action);
  revalidatePath("/admin/campaigns");
  redirect("/admin/campaigns?flash=campaign-created");
}

export async function updateCampaignAction(
  id: string,
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await ensureAdmin();
  const input = parseInput(formData);
  const fieldErrors = validateCampaign(input);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const updated = await updateCampaign(id, input);
  if (!updated) return { error: "This campaign can no longer be edited." };
  revalidatePath("/admin/campaigns");
  revalidatePath(`/admin/campaigns/${id}`);
  redirect("/admin/campaigns?flash=campaign-updated");
}

export async function sendCampaignAction(id: string): Promise<void> {
  await ensureAdmin();
  await sendCampaign(id);
  revalidatePath("/admin/campaigns");
  revalidatePath(`/admin/campaigns/${id}`);
}

export async function deleteCampaignAction(id: string): Promise<void> {
  await ensureAdmin();
  await deleteCampaign(id);
  revalidatePath("/admin/campaigns");
  redirect("/admin/campaigns?flash=campaign-deleted");
}
