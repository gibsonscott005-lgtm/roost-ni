import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canOpenPassportDocuments } from "./passport-access";

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

const KIND_COLUMN = { id: "id_document_path", income: "income_document_path", reference: "reference_document_path" } as const;

/** Landlord: a 2-minute link to one applicant document, only on a formal, active application for their own listing. */
export const getApplicantDocumentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ shareId: z.string().uuid(), kind: z.enum(["id", "income", "reference"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: share, error } = await supabaseAdmin
      .from("passport_shares")
      .select("id, tenant_id, status, formal_application_at, listing:property_listings!listing_id(landlord_id)")
      .eq("id", data.shareId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const landlordId = (share?.listing as { landlord_id?: string } | null)?.landlord_id;
    if (!share || landlordId !== context.userId) throw new Error("Application not found");
    if (!canOpenPassportDocuments(share)) {
      throw new Error("Documents unlock when the applicant submits a formal application.");
    }
    const column = KIND_COLUMN[data.kind];
    const { data: passport, error: pErr } = await supabaseAdmin
      .from("tenant_passports")
      .select(column)
      .eq("user_id", share.tenant_id!)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    const path = (passport as Record<string, string | null> | null)?.[column];
    if (!path) throw new Error("The applicant has not uploaded this document.");
    if (!path.startsWith(`${share.tenant_id}/`)) throw new Error("Document not available");
    const { data: signed, error: sErr } = await supabaseAdmin.storage.from("tenant-documents").createSignedUrl(path, 120);
    if (sErr || !signed) throw new Error("Could not open the document");
    return { url: signed.signedUrl };
  });
