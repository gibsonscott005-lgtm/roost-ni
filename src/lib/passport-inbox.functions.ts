import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Screening fields a landlord may see while an application is still pending.
 * Deliberately excludes ID document numbers, verified DOB, guarantor and
 * previous-landlord contact details — those stay private until acceptance.
 */
const SCREENING_COLUMNS = [
  "user_id",
  "identity_verified",
  "income_verified",
  "reference_verified",
  "monthly_income_net",
  "annual_income",
  "employment_status",
  "income_document_path",
  "income_breakdown",
  "willing_direct_payment_apa",
  "preferred_heating",
  "accept_empty_in_full_out",
  "id_status",
  "id_verified_at",
  "issuing_country",
  "id_document_path",
].join(", ");

/**
 * Returns the screening view of every passport shared with the calling
 * landlord's own listings. Ownership is verified server-side; the browser
 * never gets direct table access to pending applicants' passports.
 */
export const getApplicantPassports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // RLS restricts these to the caller's own listings/shares.
    const { data: listings, error: listErr } = await supabase
      .from("property_listings")
      .select("id")
      .eq("landlord_id", userId);
    if (listErr) throw new Error(listErr.message);

    const listingIds = (listings ?? []).map((l) => l.id);
    if (!listingIds.length) return { passports: [] };

    const { data: shares, error: shareErr } = await supabase
      .from("passport_shares")
      .select("tenant_id")
      .in("listing_id", listingIds);
    if (shareErr) throw new Error(shareErr.message);

    const tenantIds = Array.from(new Set((shares ?? []).map((s) => s.tenant_id)));
    if (!tenantIds.length) return { passports: [] };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error: passErr } = await supabaseAdmin
      .from("tenant_passports")
      .select(SCREENING_COLUMNS)
      .in("user_id", tenantIds);
    if (passErr) throw new Error(passErr.message);

    return { passports: rows ?? [] };
  });