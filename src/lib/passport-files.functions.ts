import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { removalPatch, type PassportFileKind } from "@/lib/passport-files";

/**
 * Tenant removes one of their own passport files. Deletes the stored file
 * (only inside the tenant's own folder) and clears the linked fields. For the
 * ID this also clears every identity detail and resets verification.
 */
export const removePassportFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { kind: PassportFileKind }) => {
    if (!["identity", "income", "reference"].includes(d?.kind)) throw new Error("Unknown document");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { pathColumn, patch } = removalPatch(data.kind);
    const { data: row, error } = await supabase
      .from("tenant_passports")
      .select(pathColumn)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    const path = (row as Record<string, string | null> | null)?.[pathColumn] ?? null;
    if (path) {
      if (!path.startsWith(`${userId}/`)) throw new Error("Forbidden");
      const { error: rmErr } = await supabase.storage.from("tenant-documents").remove([path]);
      if (rmErr) throw rmErr;
    }
    const { data: updated, error: upErr } = await supabase
      .from("tenant_passports")
      .update(patch as never)
      .eq("user_id", userId)
      .select("*")
      .maybeSingle();
    if (upErr) throw upErr;
    return { passport: updated };
  });
