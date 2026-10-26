import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEFAULT_BILLING_CONFIG, type BillingConfig } from "./pricing";

export interface BillingSnapshot {
  config: BillingConfig;
  propertyCount: number;
}

/** Billing config plus the landlord's home count. Read-only — nothing here charges anyone. */
export const getBillingSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BillingSnapshot> => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [configRes, countRes] = await Promise.all([
      supabaseAdmin.from("billing_config").select("payments_enabled, currency, notice").maybeSingle(),
      supabase
        .from("property_listings")
        .select("id", { count: "exact", head: true })
        .eq("landlord_id", userId),
    ]);

    const config = (configRes.data as BillingConfig | null) ?? DEFAULT_BILLING_CONFIG;
    return {
      config: { ...config, payments_enabled: !!config.payments_enabled },
      propertyCount: countRes.count ?? 0,
    };
  });
