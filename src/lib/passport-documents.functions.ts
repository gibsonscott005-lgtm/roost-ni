import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { authoriseShareDocAccess } from "./share-doc-access";

/** Tenant: turn an active passport share into a formal application, unlocking documents for that landlord. */
export const submitFormalApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ shareId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: share, error } = await context.supabase
      .from("passport_shares")
      .select("id, tenant_id, status")
      .eq("id", data.shareId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!share || share.tenant_id !== context.userId) throw new Error("Application not found");
    if (!["pending", "reviewed", "accepted"].includes(share.status)) throw new Error("This application is no longer active");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: upErr } = await supabaseAdmin
      .from("passport_shares")
      .update({ formal_application_at: new Date().toISOString() })
      .eq("id", share.id)
      .eq("tenant_id", context.userId);
    if (upErr) throw new Error(upErr.message);
    return { ok: true };
  });

/** Landlord: a 1-minute link to the applicant's reference letter, on a formal, active application only. */
export const signReferenceDocumentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ share_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const share = await authoriseShareDocAccess(context.supabase as never, context.userId, data.share_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: passport, error } = await supabaseAdmin
      .from("tenant_passports")
      .select("reference_document_path")
      .eq("user_id", share.tenant_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const path = passport?.reference_document_path;
    if (!path) throw new Error("No reference document on file");
    const { data: signed, error: sErr } = await supabaseAdmin.storage.from("tenant-documents").createSignedUrl(path, 60);
    if (sErr || !signed?.signedUrl) throw new Error(sErr?.message ?? "Could not open the document");
    return { url: signed.signedUrl };
  });
