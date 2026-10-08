import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const visitSchema = z.object({
  campaign: z.string().min(1).max(120),
  source: z.string().max(120).optional(),
  path: z.string().max(300).optional(),
});

/**
 * Public: records one campaign-tagged landing per browser session so the
 * marketing engine can score posts on attention, not just conversions.
 * Insert-only via the publishable key; nothing is read back.
 */
export const logCampaignVisit = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => visitSchema.parse(data))
  .handler(async ({ data }) => {
    const supabase = createClient<Database>(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_PUBLISHABLE_KEY"]!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { error } = await supabase.from("marketing_visits").insert({
      utm_campaign: data.campaign,
      utm_source: data.source ?? null,
      landing_path: data.path ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
