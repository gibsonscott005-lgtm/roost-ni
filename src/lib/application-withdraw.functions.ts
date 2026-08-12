import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const withdrawSchema = z.object({
  shareId: z.string().uuid(),
  reason: z.string().trim().max(300).optional(),
});

const reapplySchema = z.object({ shareId: z.string().uuid() });

type ShareRow = {
  id: string;
  tenant_id: string;
  listing_id: string;
  status: string;
  lease_status: string | null;
  withdraw_count: number | null;
};

/**
 * Withdraw an application the caller owns. Allowed only before a lease has
 * been issued. Reverts the listing from "under offer" when the withdrawn
 * applicant was the accepted one, and tells the landlord.
 */
export const withdrawApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => withdrawSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: share, error } = await supabaseAdmin
      .from("passport_shares")
      .select("id, tenant_id, listing_id, status, lease_status, withdraw_count")
      .eq("id", data.shareId)
      .maybeSingle<ShareRow>();
    if (error) throw new Error(error.message);
    if (!share) throw new Error("Application not found");
    if (share.tenant_id !== userId) throw new Error("Forbidden");
    if (share.status === "withdrawn") return { ok: true, relisted: false };
    if (share.lease_status) {
      throw new Error(
        "A lease has already been issued for this application — use the lease screen instead.",
      );
    }

    const wasAccepted = share.status === "accepted";

    const { error: updErr } = await supabaseAdmin
      .from("passport_shares")
      .update({
        status: "withdrawn",
        withdrawn_at: new Date().toISOString(),
        withdrawn_reason: data.reason?.length ? data.reason : null,
      } as never)
      .eq("id", share.id);
    if (updErr) throw new Error(updErr.message);

    const { data: listing } = await supabaseAdmin
      .from("property_listings")
      .select("id, landlord_id, title, status")
      .eq("id", share.listing_id)
      .maybeSingle<{ id: string; landlord_id: string; title: string; status: string }>();

    let relisted = false;
    if (wasAccepted && listing?.status === "under_offer") {
      const { error: listErr } = await supabaseAdmin
        .from("property_listings")
        .update({ status: "available" } as never)
        .eq("id", listing.id);
      if (!listErr) relisted = true;
    }

    if (listing?.landlord_id) {
      await supabaseAdmin.rpc("emit_notification", {
        p_recipient_id: listing.landlord_id,
        p_actor_id: userId,
        p_type: "application_withdrawn",
        p_entity_type: "passport_share",
        p_entity_id: share.id,
        p_title: "Applicant withdrew their application",
        p_body: relisted
          ? `An accepted applicant for ${listing.title} withdrew. The property is back to available.`
          : `An applicant for ${listing.title} withdrew their application.`,
        p_link_path: "/dashboard/applications",
      });
    }

    return { ok: true, relisted };
  });

/**
 * Re-submit a previously withdrawn application. The same record is reused so
 * the landlord keeps an honest history rather than duplicate entries.
 */
export const reapplyApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reapplySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: share, error } = await supabaseAdmin
      .from("passport_shares")
      .select("id, tenant_id, listing_id, status, lease_status, withdraw_count")
      .eq("id", data.shareId)
      .maybeSingle<ShareRow>();
    if (error) throw new Error(error.message);
    if (!share) throw new Error("Application not found");
    if (share.tenant_id !== userId) throw new Error("Forbidden");
    if (share.status !== "withdrawn") throw new Error("This application is already active");

    const { data: listing } = await supabaseAdmin
      .from("property_listings")
      .select("id, landlord_id, title, status, is_published")
      .eq("id", share.listing_id)
      .maybeSingle<{
        id: string;
        landlord_id: string;
        title: string;
        status: string;
        is_published: boolean;
      }>();
    if (!listing || !listing.is_published) {
      throw new Error("This property is no longer accepting applications");
    }
    if (listing.status !== "available") {
      throw new Error("This property is no longer available");
    }

    const { error: updErr } = await supabaseAdmin
      .from("passport_shares")
      .update({
        status: "pending",
        shared_at: new Date().toISOString(),
        withdraw_count: (share.withdraw_count ?? 0) + 1,
      } as never)
      .eq("id", share.id);
    if (updErr) throw new Error(updErr.message);

    await supabaseAdmin.rpc("emit_notification", {
      p_recipient_id: listing.landlord_id,
      p_actor_id: userId,
      p_type: "application_reapplied",
      p_entity_type: "passport_share",
      p_entity_id: share.id,
      p_title: "Applicant re-applied",
      p_body: `A previous applicant has re-submitted their passport for ${listing.title}.`,
      p_link_path: "/dashboard/applications",
    });

    return { ok: true };
  });