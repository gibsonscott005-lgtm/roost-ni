import { supabase } from "@/integrations/supabase/client";
import { getEventContext } from "@/lib/utm-session";
import type { FunnelEvent } from "@/lib/landlord-funnel";

const sent = new Set<string>();

/**
 * Records a landlord funnel step for the signed-in landlord. The database keeps
 * the first time and bumps the latest timestamp; tenants and admins are ignored.
 * Never throws — tracking must not break the page.
 */
export function trackLandlordStep(event: Exclude<FunnelEvent, "signed_up" | "confirmation_email_sent" | "email_confirmed" | "first_sign_in" | "help_requested">) {
  if (typeof window === "undefined" || sent.has(event)) return;
  sent.add(event);
  const utm = getEventContext();
  void supabase
    .rpc("log_landlord_funnel_event", {
      p_event: event,
      p_utm_source: utm.source ?? undefined,
      p_utm_medium: utm.medium ?? undefined,
      p_utm_campaign: utm.campaign ?? undefined,
      p_utm_content: utm.content ?? undefined,
    })
    .then(({ error }) => {
      if (error) sent.delete(event);
    });
}
