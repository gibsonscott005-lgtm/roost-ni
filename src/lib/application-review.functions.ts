import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type OwnedShare = {
  id: string;
  tenant_id: string;
  listing_id: string;
  status: string;
  lease_status: string | null;
  listing: { id: string; landlord_id: string; title: string; status: string } | null;
};

/** Loads a share with the service-role client and confirms the caller owns its listing. */
async function loadOwnedShare(userId: string, shareId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("passport_shares")
    .select(
      "id, tenant_id, listing_id, status, lease_status, listing:property_listings!listing_id(id, landlord_id, title, status)",
    )
    .eq("id", shareId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const share = data as unknown as OwnedShare | null;
  if (!share) throw new Error("Application not found");
  const listing = Array.isArray(share.listing) ? share.listing[0] : share.listing;
  if (!listing || listing.landlord_id !== userId) throw new Error("Forbidden");
  return { supabaseAdmin, share: { ...share, listing } };
}

const declineSchema = z.object({
  shareId: z.string().uuid(),
  reason: z.string().trim().max(300).optional(),
});

/**
 * Declines an application. The 'declined' status sits outside the document
 * access allow-list, so the landlord's signed-URL access ends immediately.
 */
export const declineApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => declineSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, share } = await loadOwnedShare(context.userId, data.shareId);
    if (share.status === "withdrawn") throw new Error("The applicant has already withdrawn");
    if (share.status === "declined") return { ok: true, relisted: false };
    if (share.lease_status) {
      throw new Error("A lease has already been issued for this application.");
    }
    const wasAccepted = share.status === "accepted";
    const { error } = await supabaseAdmin
      .from("passport_shares")
      .update({
        status: "declined",
        declined_at: new Date().toISOString(),
        declined_reason: data.reason?.length ? data.reason : null,
      } as never)
      .eq("id", share.id);
    if (error) throw new Error(error.message);

    let relisted = false;
    if (wasAccepted && share.listing.status === "under_offer") {
      const { error: lErr } = await supabaseAdmin
        .from("property_listings")
        .update({ status: "available" } as never)
        .eq("id", share.listing.id);
      if (!lErr) relisted = true;
    }

    await supabaseAdmin.rpc("emit_notification", {
      p_recipient_id: share.tenant_id,
      p_actor_id: context.userId,
      p_type: "application_declined",
      p_entity_type: "passport_share",
      p_entity_id: share.id,
      p_title: "Application update",
      p_body: `The landlord for ${share.listing.title} has decided not to progress your application. Their access to your passport documents has ended.`,
      p_link_path: "/dashboard",
    });
    return { ok: true, relisted };
  });

export const INFO_REQUEST_ITEMS = [
  "updated_payslip",
  "bank_statement",
  "guarantor_details",
  "previous_landlord_contact",
  "employer_contact",
  "viewing_availability",
] as const;

const infoSchema = z.object({
  shareId: z.string().uuid(),
  items: z.array(z.enum(INFO_REQUEST_ITEMS)).min(1).max(INFO_REQUEST_ITEMS.length),
  message: z.string().trim().max(400).optional(),
});

const ITEM_LABELS: Record<(typeof INFO_REQUEST_ITEMS)[number], string> = {
  updated_payslip: "an updated payslip",
  bank_statement: "a recent bank statement",
  guarantor_details: "guarantor details",
  previous_landlord_contact: "previous landlord contact details",
  employer_contact: "employer contact details",
  viewing_availability: "your availability for a viewing",
};

/** Asks the applicant for more information without changing the decision status. */
export const requestApplicantInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => infoSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, share } = await loadOwnedShare(context.userId, data.shareId);
    if (!["pending", "reviewed"].includes(share.status)) {
      throw new Error("Information can only be requested on open applications.");
    }
    const { error } = await supabaseAdmin
      .from("passport_shares")
      .update({
        status: "reviewed",
        info_requested_at: new Date().toISOString(),
        info_requested_items: data.items,
      } as never)
      .eq("id", share.id);
    if (error) throw new Error(error.message);

    const list = data.items.map((i) => ITEM_LABELS[i]).join(", ");
    const body = `The landlord for ${share.listing.title} has asked for ${list}.${data.message ? ` Note: "${data.message}"` : ""} Update your passport to share it.`;
    await supabaseAdmin.rpc("emit_notification", {
      p_recipient_id: share.tenant_id,
      p_actor_id: context.userId,
      p_type: "application_info_requested",
      p_entity_type: "passport_share",
      p_entity_id: share.id,
      p_title: "Landlord requested more information",
      p_body: body.slice(0, 500),
      p_link_path: "/dashboard/passport",
    });
    return { ok: true };
  });
