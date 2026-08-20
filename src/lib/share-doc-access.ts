/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Statuses that still entitle a landlord to view an applicant's documents.
 * Explicit allow-list (not a `!== "withdrawn"` deny-list) so any future
 * share_status value is denied by default until it is reviewed.
 */
const DOC_ACCESS_STATUSES = ["pending", "reviewed", "accepted"] as const;

type ShareGuardResult = { tenant_id: string };

function isAllowedStatus(status: unknown): boolean {
  return DOC_ACCESS_STATUSES.includes(status as (typeof DOC_ACCESS_STATUSES)[number]);
}

/**
 * Authorises a landlord to read documents belonging to the applicant on
 * `shareId`. Requires BOTH:
 *  - the share's listing is owned by the caller, and
 *  - the share is in a status that still grants document access
 *    (a withdrawn application immediately revokes it).
 */
export async function authoriseShareDocAccess(
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
  if (!isAllowedStatus(share.status)) {
    throw new Error("Application not found or access revoked");
  }

  const listing = Array.isArray(share.listing) ? share.listing[0] : share.listing;
  if (!listing || listing.landlord_id !== userId) {
    throw new Error("Forbidden");
  }

  // Final authority: re-read the share with the service-role client so the
  // decision never depends on RLS visibility or a stale/cached row. Both the
  // status allow-list and the listing ownership are enforced again here.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: authoritative, error: adminErr } = await supabaseAdmin
    .from("passport_shares")
    .select("status, tenant_id, listing:property_listings!listing_id(landlord_id)")
    .eq("id", shareId)
    .maybeSingle();

  if (adminErr) throw new Error(adminErr.message);
  if (!authoritative || !isAllowedStatus(authoritative.status)) {
    throw new Error("Application not found or access revoked");
  }
  const adminListing = Array.isArray(authoritative.listing)
    ? authoritative.listing[0]
    : authoritative.listing;
  if (!adminListing || (adminListing as any).landlord_id !== userId) {
    throw new Error("Forbidden");
  }

  return { tenant_id: authoritative.tenant_id as string };
}
