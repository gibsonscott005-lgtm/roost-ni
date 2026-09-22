import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  DEFAULT_BILLING_CONFIG,
  PRICING_ITEMS,
  PRICING_TIERS,
  type BillingConfig,
  type PricingItem,
  type PricingTier,
} from "./pricing";

export interface BillingSnapshot {
  config: BillingConfig;
  tiers: PricingTier[];
  items: PricingItem[];
  propertyCount: number;
}

/**
 * Resolved pricing for the signed-in landlord: the catalogue plus their active
 * property count, which is what selects their tier. Read-only — nothing here
 * charges anyone.
 */
export const getBillingSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BillingSnapshot> => {
    const { supabase, userId } = context;

    // The catalogue tables are no longer readable by app users directly; the
    // caller is already authenticated above, so we read them server-side.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [tiersRes, itemsRes, configRes, countRes] = await Promise.all([
      supabaseAdmin.from("pricing_tiers").select("*").order("sort_order"),
      supabaseAdmin.from("pricing_items").select("*").eq("is_active", true).order("sort_order"),
      supabaseAdmin
        .from("billing_config")
        .select("payments_enabled, currency, notice")
        .maybeSingle(),
      supabase
        .from("property_listings")
        .select("id", { count: "exact", head: true })
        .eq("landlord_id", userId),
    ]);

    const tiers = (tiersRes.data as PricingTier[] | null) ?? PRICING_TIERS;
    const items = (itemsRes.data as PricingItem[] | null) ?? PRICING_ITEMS;
    const config = (configRes.data as BillingConfig | null) ?? DEFAULT_BILLING_CONFIG;

    return {
      config: { ...config, payments_enabled: !!config.payments_enabled },
      tiers: tiers.length ? tiers : PRICING_TIERS,
      items: items.length ? items : PRICING_ITEMS,
      propertyCount: countRes.count ?? 0,
    };
  });
