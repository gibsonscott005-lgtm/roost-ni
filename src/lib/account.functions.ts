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
    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw error;
    return { ok: true };
  });
