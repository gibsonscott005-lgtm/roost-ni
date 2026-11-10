import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { FORMAL_FIELDS, SUMMARY_FIELDS, landlordPassportView } from "@/lib/passport-stage";

// Read server-side only; the ID document number is deliberately never selected.
const PASSPORT_COLUMNS = Array.from(
  new Set([
    "user_id",
    ...SUMMARY_FIELDS,
    ...FORMAL_FIELDS,
    "id_document_path",
    "income_document_path",
    "reference_document_path",
  ]),
).join(", ");

/**
 * Returns one landlord view per active share on the caller's own listings,
 * staged by formal application (see passport-stage.ts).
 */
export const getApplicantPassports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: listings, error: listErr } = await supabase
      .from("property_listings")
      .select("id, monthly_rent")
      .eq("landlord_id", userId);
    if (listErr) throw new Error(listErr.message);
    const rentById = new Map((listings ?? []).map((l) => [l.id, Number(l.monthly_rent) || null]));
    if (!rentById.size) return { passports: [] };

    const { data: shares, error: shareErr } = await supabase
      .from("passport_shares")
      .select("id, tenant_id, listing_id, status, formal_application_at, withdrawn_at")
      .in("listing_id", Array.from(rentById.keys()))
      .not("status", "in", "(withdrawn,declined,rejected)");
    if (shareErr) throw new Error(shareErr.message);
    const live = (shares ?? []).filter((s) => !!s.tenant_id);
    const tenantIds = Array.from(new Set(live.map((s) => s.tenant_id as string)));
    if (!tenantIds.length) return { passports: [] };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error: passErr } = await supabaseAdmin
      .from("tenant_passports")
      .select(PASSPORT_COLUMNS)
      .in("user_id", tenantIds);
    if (passErr) throw new Error(passErr.message);
    const byUser = new Map(((rows ?? []) as unknown as Record<string, unknown>[]).map((r) => [r.user_id as string, r]));

    const passports = live.flatMap((s) => {
      const row = byUser.get(s.tenant_id as string);
      return row ? [landlordPassportView(row, s, rentById.get(s.listing_id) ?? null)] : [];
    });
    return { passports };
  });
