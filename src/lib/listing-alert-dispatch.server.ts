// Server-only: sends tenant listing-alert emails. Never import from client code.
import { hashEmail, isTestListing, matchesArea, sentToday } from "@/lib/listing-alert-match";

const SITE = "https://roostni.co.uk";
/** Owner address used for the safety-mode copy while live delivery is off. */
export const OWNER_ALERT_EMAIL = "usgibsons2004@gmail.com";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

interface ListingRow {
  id: string;
  title: string;
  address: string;
  location: string | null;
  monthly_rent: number;
  bedrooms: number | null;
  is_published: boolean;
  is_test: boolean;
  alerts_sent_at: string | null;
}

async function capture(event: string, distinctId: string, properties: Record<string, unknown>) {
  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_API_KEY as string | undefined;
  if (!key) return;
  const host =
    (import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_REGION as string | undefined) === "us"
      ? "https://us.i.posthog.com"
      : "https://eu.i.posthog.com";
  try {
    await fetch(`${host}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: key, event, distinct_id: distinctId, properties }),
    });
  } catch {
    /* analytics is best-effort */
  }
}

export async function loadListing(admin: Admin, id: string): Promise<ListingRow | null> {
  const { data } = await admin
    .from("property_listings")
    .select("id, title, address, location, monthly_rent, bedrooms, is_published, is_test, alerts_sent_at")
    .eq("id", id)
    .maybeSingle();
  return (data as ListingRow | null) ?? null;
}

const areaOf = (l: ListingRow) => l.location?.split(",")[0]?.trim() || "Northern Ireland";

async function sendOne(
  to: string,
  token: string,
  l: ListingRow,
  opts: { isPreview: boolean; idempotencyKey: string },
) {
  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
  return sendTemplateEmail("listing-alert-subscriber", to, {
    templateData: {
      title: l.title,
      area: areaOf(l),
      rent: l.monthly_rent,
      bedrooms: l.bedrooms,
      url: `${SITE}/listings/${l.id}`,
      unsubscribeUrl: `${SITE}/unsubscribe?token=${token}`,
      isPreview: opts.isPreview,
    },
    idempotencyKey: opts.idempotencyKey,
  });
}

/** Gets (or creates) a subscriber row so a preview carries a real, working unsubscribe token. */
async function tokenFor(admin: Admin, email: string): Promise<string> {
  const e = email.trim().toLowerCase();
  const { data } = await admin
    .from("listing_alert_subscribers")
    .select("unsubscribe_token")
    .eq("email", e)
    .maybeSingle();
  if (data?.unsubscribe_token) return data.unsubscribe_token;
  const { data: created, error } = await admin
    .from("listing_alert_subscribers")
    .insert({ email: e, utm: { source: "admin_preview" } })
    .select("unsubscribe_token")
    .single();
  if (error || !created) throw new Error("Couldn't prepare the preview unsubscribe link.");
  return created.unsubscribe_token;
}

/**
 * Preview: sends the real email to one address only. Ignores the test-listing
 * filter and never writes alerts_sent_at or last_alert_sent_at.
 */
export async function sendListingAlertPreview(admin: Admin, listingId: string, to: string) {
  const l = await loadListing(admin, listingId);
  if (!l) throw new Error("Listing not found.");
  const token = await tokenFor(admin, to);
  const res = await sendOne(to, token, l, {
    isPreview: true,
    idempotencyKey: `listing-alert-preview-${l.id}-${Date.now()}`,
  });
  await capture("listing_alert_email_sent", await hashEmail(to), {
    listing_id: l.id,
    preview: true,
    sent: res.sent,
  });
  return res;
}

/**
 * Called when a listing goes live. Test listings and already-alerted listings
 * are skipped. While live delivery is off, only a preview goes to the owner and
 * nothing is recorded, so the listing still alerts once delivery is switched on.
 */
export async function dispatchListingAlerts(admin: Admin, listingId: string) {
  const l = await loadListing(admin, listingId);
  if (!l || !l.is_published) return { status: "not_published" as const };
  if (isTestListing(l)) return { status: "test_listing" as const };
  if (l.alerts_sent_at) return { status: "already_alerted" as const };

  const { data: settings } = await admin
    .from("listing_alert_settings")
    .select("live_delivery")
    .eq("id", true)
    .maybeSingle();

  if (!settings?.live_delivery) {
    await sendListingAlertPreview(admin, l.id, OWNER_ALERT_EMAIL);
    return { status: "safety_mode" as const };
  }

  // Claim the listing first so a re-publish can never send twice.
  const { data: claimed } = await admin
    .from("property_listings")
    .update({ alerts_sent_at: new Date().toISOString() })
    .eq("id", l.id)
    .is("alerts_sent_at", null)
    .select("id");
  if (!claimed?.length) return { status: "already_alerted" as const };

  const { data: subs } = await admin
    .from("listing_alert_subscribers")
    .select("id, email, utm, unsubscribe_token, last_alert_sent_at")
    .limit(2000);

  let sent = 0;
  for (const s of subs ?? []) {
    const sub = { utm: s.utm as Record<string, unknown>, last_alert_sent_at: s.last_alert_sent_at };
    if (!matchesArea(l, sub) || sentToday(s.last_alert_sent_at)) continue;
    try {
      const res = await sendOne(s.email, s.unsubscribe_token, l, {
        isPreview: false,
        idempotencyKey: `listing-alert-${l.id}-${s.id}`,
      });
      if (res.sent) {
        sent++;
        await admin
          .from("listing_alert_subscribers")
          .update({ last_alert_sent_at: new Date().toISOString() })
          .eq("id", s.id);
      }
      await capture("listing_alert_email_sent", await hashEmail(s.email), {
        listing_id: l.id,
        preview: false,
        sent: res.sent,
      });
    } catch (err) {
      console.error("listing alert send failed", err);
    }
  }
  return { status: "sent" as const, sent };
}
