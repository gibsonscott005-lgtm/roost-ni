import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const notifySchema = z.object({ listingId: z.string().uuid() });

const subscribeSchema = z.object({
  email: z.string().trim().email().max(200),
  utm: z.record(z.string(), z.string().max(120)).optional(),
  alert: z
    .object({
      area: z.string().trim().max(120).optional(),
      bedrooms: z.number().int().min(0).max(50).optional(),
      maxRent: z.number().int().min(0).max(100000).optional(),
      listingId: z.string().uuid().optional(),
    })
    .optional(),
});

/**
 * Public: adds an email address to the new-listing alert list. Runs with the
 * publishable key against an anon INSERT policy — no session required, and
 * nothing is read back. Duplicate emails are ignored silently. Optional alert
 * filters (area, bedrooms, rent) are stored alongside attribution in `utm`.
 */
export const subscribeToListingAlerts = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => subscribeSchema.parse(data))
  .handler(async ({ data }) => {
    const supabase = createClient<Database>(
      process.env['SUPABASE_URL']!,
      process.env['SUPABASE_PUBLISHABLE_KEY']!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    const meta: Record<string, string> = { ...(data.utm ?? {}) };
    if (data.alert?.area) meta.alert_area = data.alert.area;
    if (data.alert?.bedrooms !== undefined) meta.alert_bedrooms = String(data.alert.bedrooms);
    if (data.alert?.maxRent !== undefined) meta.alert_max_rent = String(data.alert.maxRent);
    if (data.alert?.listingId) meta.alert_source_listing = data.alert.listingId;

    const { error } = await supabase
      .from("listing_alert_subscribers" as never)
      .insert({ email: data.email.trim().toLowerCase(), utm: meta } as never);

    // A duplicate email just means they're already on the list — not an error.
    if (error && (error as { code?: string }).code !== "23505") {
      throw new Error(error.message);
    }
    return { ok: true };
  });

const unsubscribeSchema = z.object({ token: z.string().uuid() });

/**
 * Public: removes the subscriber holding this unsubscribe token. Only called
 * when the person taps the button, so link scanners can't unsubscribe anyone.
 * Always returns ok so the page never reveals whether a token was valid.
 */
export const unsubscribeFromListingAlerts = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => unsubscribeSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("listing_alert_subscribers")
      .delete()
      .eq("unsubscribe_token", data.token);
    return { ok: true };
  });

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("is_admin_profile", { _uid: context.userId });
  if (!data) throw new Error("Forbidden");
}

/** Admin: live-delivery switch state plus listings available to preview. */
export const getListingAlertAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: settings }, { data: listings }] = await Promise.all([
      supabaseAdmin.from("listing_alert_settings").select("live_delivery, updated_at").eq("id", true).maybeSingle(),
      supabaseAdmin
        .from("property_listings")
        .select("id, title, location, is_test, is_published, alerts_sent_at")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    return {
      liveDelivery: settings?.live_delivery ?? false,
      updatedAt: settings?.updated_at ?? null,
      listings: listings ?? [],
    };
  });

/** Admin only: switch live subscriber delivery on or off. */
export const setListingAlertLiveDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ live: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("listing_alert_settings")
      .update({ live_delivery: data.live, updated_at: new Date().toISOString(), updated_by: context.userId })
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { liveDelivery: data.live };
  });

/** Admin only: flag or unflag a listing as a test listing. */
export const setListingIsTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ listingId: z.string().uuid(), isTest: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("property_listings").update({ is_test: data.isTest }).eq("id", data.listingId);
    return { ok: true };
  });

/** Admin only: send the real alert email for any listing to the admin's own sign-in address. */
export const sendListingAlertPreviewToMe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => notifySchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const email = (context.claims as { email?: string }).email;
    if (!email) throw new Error("Your account has no email address.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendListingAlertPreview } = await import("@/lib/listing-alert-dispatch.server");
    const res = await sendListingAlertPreview(supabaseAdmin, data.listingId, email);
    return { sent: res.sent, to: email };
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
      try {
        const { dispatchListingAlerts } = await import("@/lib/listing-alert-dispatch.server");
        await dispatchListingAlerts(supabaseAdmin, row.id);
      } catch (err) {
        console.error("listing alert dispatch failed", err);
      }
      return result;
    } catch {
      return { sent: false as const, reason: "error" as const };
    }
  });
