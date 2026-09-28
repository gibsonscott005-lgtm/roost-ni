import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const subscribeSchema = z.object({
  email: z.string().trim().email().max(200),
  utm: z.record(z.string(), z.string().max(120)).optional(),
});

/**
 * Public: adds an email address to the new-listing alert list. Runs with the
 * publishable key against an anon INSERT policy — no session required, and
 * nothing is read back. Duplicate emails are ignored silently.
 */
export const subscribeToListingAlerts = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => subscribeSchema.parse(data))
  .handler(async ({ data }) => {
    const supabase = createClient<Database>(
      process.env['SUPABASE_URL']!,
      process.env['SUPABASE_PUBLISHABLE_KEY']!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    const { error } = await supabase
      .from("listing_alert_subscribers" as never)
      .upsert(
        { email: data.email.trim().toLowerCase(), utm: data.utm ?? {} } as never,
        { onConflict: "email", ignoreDuplicates: true },
      );

    if (error) throw new Error(error.message);
    return { ok: true };
  });

const notifySchema = z.object({
  listingId: z.string().uuid(),
});

/**
 * Landlord-only: called after a listing is published. Verifies the caller owns
 * the listing and that it is actually live, then sends the owner a single
 * operational heads-up email (fixed recipient on the template) so interested
 * tenants on the alert list can be told. Best-effort: never throws, so a
 * failed email can never break the landlord's publish flow.
 */
export const notifyListingPublished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => notifySchema.parse(data))
  .handler(async ({ data, context }) => {
    try {
      const { data: listing } = await context.supabase
        .from("property_listings")
        .select("id, title, location, monthly_rent, bedrooms, is_published")
        .eq("id", data.listingId)
        .eq("landlord_id", context.userId)
        .maybeSingle();

      const row = listing as {
        id: string;
        title: string;
        location: string | null;
        monthly_rent: number;
        bedrooms: number | null;
        is_published: boolean;
      } | null;

      if (!row || !row.is_published) {
        return { sent: false as const, reason: "not_published" as const };
      }

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { count } = await supabaseAdmin
        .from("listing_alert_subscribers" as never)
        .select("id", { count: "exact", head: true });

      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      const today = new Date().toISOString().slice(0, 10);
      const result = await sendTemplateEmail("listing-published", "owner", {
        templateData: {
          title: row.title,
          area: row.location ?? "Northern Ireland",
          rent: row.monthly_rent,
          bedrooms: row.bedrooms,
          url: `https://roostni.co.uk/listings/${row.id}`,
          subscriberCount: count ?? 0,
        },
        idempotencyKey: `listing-published-${row.id}-${today}`,
      });
      return result;
    } catch {
      return { sent: false as const, reason: "error" as const };
    }
  });
