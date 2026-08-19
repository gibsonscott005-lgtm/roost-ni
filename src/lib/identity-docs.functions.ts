import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({ share_id: z.string().uuid() });

export type SignIdDocInput = z.infer<typeof inputSchema>;

/**
 * Statuses that still entitle a landlord to view an applicant's documents.
 * Explicit allow-list (not a `!== "withdrawn"` deny-list) so any future
 * share_status value is denied by default until it is reviewed.
 */
const DOC_ACCESS_STATUSES = ["pending", "reviewed", "accepted"] as const;

type ShareGuardResult = { tenant_id: string };

/**
 * Authorises a landlord to read documents belonging to the applicant on
 * `shareId`. Requires BOTH:
 *  - the share's listing is owned by the caller, and
 *  - the share is in a status that still grants document access
 *    (a withdrawn application immediately revokes it).
 */
async function authoriseShareDocAccess(
  supabase: { from: (t: string) => any },
  userId: string,
  shareId: string,
): Promise<ShareGuardResult> {
  const { data: share, error: shareErr } = await supabase
    .from("passport_shares")
    .select("id, status, tenant_id, listing:property_listings!listing_id(id, landlord_id)")
    .eq("id", shareId)
    .in("status", DOC_ACCESS_STATUSES as unknown as string[])
    .maybeSingle();

  if (shareErr) throw new Error(shareErr.message);
  if (!share) throw new Error("Application not found or access revoked");

  // Defence in depth: re-check the status on the returned row in case the
  // filter above is ever relaxed or the column is renamed.
  if (!DOC_ACCESS_STATUSES.includes(share.status)) {
    throw new Error("Application not found or access revoked");
  }

  const listing = Array.isArray(share.listing) ? share.listing[0] : share.listing;
  if (!listing || listing.landlord_id !== userId) {
    throw new Error("Forbidden");
  }

  return { tenant_id: share.tenant_id };
}

export const signIdDocumentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const share = await authoriseShareDocAccess(supabase as never, userId, data.share_id);

    // Load the tenant's current id_document_path via authenticated client (RLS applies).
    // Landlords cannot read tenant_passports directly, so use admin after auth check.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: passport, error: passErr } = await supabaseAdmin
      .from("tenant_passports")
      .select("id_document_path")
      .eq("user_id", share.tenant_id)
      .maybeSingle();

    if (passErr) throw new Error(passErr.message);
    const path = passport?.id_document_path;
    if (!path) throw new Error("No identity document on file");

    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("tenant-documents")
      .createSignedUrl(path, 60);

    if (signErr || !signed?.signedUrl) {
      throw new Error(signErr?.message ?? "Could not create signed URL");
    }
    return { url: signed.signedUrl, expires_in: 60 };
  });

export const signIncomeDocumentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const share = await authoriseShareDocAccess(supabase as never, userId, data.share_id);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: passport, error: passErr } = await supabaseAdmin
      .from("tenant_passports")
      .select("income_document_path")
      .eq("user_id", share.tenant_id)
      .maybeSingle();

    if (passErr) throw new Error(passErr.message);
    const path = passport?.income_document_path;
    if (!path) throw new Error("No income document on file");

    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("tenant-documents")
      .createSignedUrl(path, 60);

    if (signErr || !signed?.signedUrl) {
      throw new Error(signErr?.message ?? "Could not create signed URL");
    }
    return { url: signed.signedUrl, expires_in: 60 };
  });
