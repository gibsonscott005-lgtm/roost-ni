import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({ share_id: z.string().uuid() });

export type SignIdDocInput = z.infer<typeof inputSchema>;

export const signIdDocumentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify: this share references a listing owned by the caller.
    const { data: share, error: shareErr } = await supabase
      .from("passport_shares")
      .select("id, tenant_id, listing:property_listings!listing_id(id, landlord_id)")
      .eq("id", data.share_id)
      .maybeSingle();

    if (shareErr) throw new Error(shareErr.message);
    if (!share) throw new Error("Application not found");
    const listing = Array.isArray(share.listing) ? share.listing[0] : share.listing;
    if (!listing || listing.landlord_id !== userId) {
      throw new Error("Forbidden");
    }

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

    const { data: share, error: shareErr } = await supabase
      .from("passport_shares")
      .select("id, tenant_id, listing:property_listings!listing_id(id, landlord_id)")
      .eq("id", data.share_id)
      .maybeSingle();

    if (shareErr) throw new Error(shareErr.message);
    if (!share) throw new Error("Application not found");
    const listing = Array.isArray(share.listing) ? share.listing[0] : share.listing;
    if (!listing || listing.landlord_id !== userId) {
      throw new Error("Forbidden");
    }

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
