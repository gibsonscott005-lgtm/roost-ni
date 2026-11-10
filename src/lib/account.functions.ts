import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Self-service account deletion. Authenticated users may delete only their own
 * account. Uses the service-role client for the Auth Admin deleteUser call.
 */
export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Re-authenticate the bearer token before a destructive action.
    const { data, error: verifyError } = await context.supabase.auth.getUser();
    if (verifyError || !data.user) {
      throw new Error("Session verification failed");
    }
    if (data.user.id !== context.userId) {
      throw new Error("Forbidden");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Remove the account's stored files first so nothing is left behind.
    await removeFolder(supabaseAdmin, "tenant-documents", context.userId);
    const { data: listings } = await supabaseAdmin
      .from("property_listings")
      .select("photo_urls")
      .eq("landlord_id", context.userId);
    const photos = (listings ?? []).flatMap((l) => (l.photo_urls ?? []) as string[]);
    if (photos.length) {
      const { error: pErr } = await supabaseAdmin.storage.from("listing-photos").remove(photos);
      if (pErr) throw pErr;
    }
    await removeFolder(supabaseAdmin, "listing-photos", context.userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw error;
    return { ok: true };
  });

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

/** Recursively delete every object under `<prefix>/` in a bucket. */
async function removeFolder(admin: Admin, bucket: string, prefix: string): Promise<void> {
  const files: string[] = [];
  const walk = async (dir: string) => {
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await admin.storage.from(bucket).list(dir, { limit: 1000, offset });
      if (error) throw error;
      for (const item of data ?? []) {
        const full = `${dir}/${item.name}`;
        if (item.id) files.push(full);
        else await walk(full);
      }
      if (!data || data.length < 1000) break;
    }
  };
  await walk(prefix);
  for (let i = 0; i < files.length; i += 100) {
    const { error } = await admin.storage.from(bucket).remove(files.slice(i, i + 100));
    if (error) throw error;
  }
}
