import { createServerFn } from "@tanstack/react-start";
import { isInternalEmail } from "@/lib/internal-accounts";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  stepCounts,
  summariseLandlord,
  type FunnelRow,
  type LandlordFunnelEntry,
  type StepCount,
} from "@/lib/landlord-funnel";

const utmSchema = z
  .object({
    source: z.string().max(120).optional(),
    medium: z.string().max(120).optional(),
    campaign: z.string().max(120).optional(),
    content: z.string().max(120).optional(),
  })
  .optional();

/**
 * Landlord taps "Want me to set this up for you?". Logs help_requested and
 * emails the owner only — the landlord is never emailed.
 */
export const requestSetupHelp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ utm: utmSchema }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("full_name, account_type")
      .eq("id", context.userId)
      .maybeSingle();
    if (profile?.account_type !== "landlord") throw new Error("Only landlord accounts can ask for set-up help");

    const { error } = await context.supabase.rpc("log_landlord_funnel_event", {
      p_event: "help_requested",
      p_utm_source: data.utm?.source,
      p_utm_medium: data.utm?.medium,
      p_utm_campaign: data.utm?.campaign,
      p_utm_content: data.utm?.content,
    });
    if (error) throw new Error("Could not record your request. Please try again.");

    const { data: me } = await context.supabase.auth.getUser();
    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      const day = new Date().toISOString().slice(0, 10);
      await sendTemplateEmail("setup-help-requested", "scott@roostni.co.uk", {
        templateData: { name: profile.full_name || "A landlord", email: me.user?.email ?? "" },
        idempotencyKey: `setup-help-${context.userId}-${day}`,
      });
    } catch (e) {
      console.error("[setup-help] email failed", e);
    }
    return { ok: true };
  });

export interface LandlordFunnelRow extends LandlordFunnelEntry {
  name: string;
  email: string | null;
  signedUpAt: string;
}

export interface LandlordFunnelReport {
  steps: StepCount[];
  landlords: LandlordFunnelRow[];
  helpRequests: number;
  stuck: number;
}

/** Admin-only funnel report. Emails are joined here, never stored in the funnel table. */
export const getLandlordFunnel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LandlordFunnelReport> => {
    const { data: me } = await context.supabase
      .from("profiles")
      .select("account_type")
      .eq("id", context.userId)
      .maybeSingle();
    if (me?.account_type !== "admin") throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [profilesRes, eventsRes, usersRes] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, full_name, created_at")
        .eq("account_type", "landlord")
        .order("created_at", { ascending: false })
        .limit(1000),
      supabaseAdmin.from("landlord_funnel_events").select("user_id, event, created_at, last_at").limit(10000),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
    const emailById = new Map((usersRes.data?.users ?? []).map((u) => [u.id, u.email ?? null]));
    const byUser = new Map<string, FunnelRow[]>();
    for (const r of (eventsRes.data ?? []) as FunnelRow[]) {
      const list = byUser.get(r.user_id) ?? [];
      list.push(r);
      byUser.set(r.user_id, list);
    }
    const now = Date.now();
    const landlords: LandlordFunnelRow[] = (profilesRes.data ?? [])
      .filter((p) => !isInternalEmail(emailById.get(p.id)))
      .map((p) => {
        const rows = byUser.get(p.id) ?? [
          { user_id: p.id, event: "signed_up", created_at: p.created_at, last_at: p.created_at },
        ];
        return {
          ...summariseLandlord(p.id, rows, now),
          name: p.full_name,
          email: emailById.get(p.id) ?? null,
          signedUpAt: p.created_at,
        };
      })
      .sort((a, b) => (b.lastActivity ?? "").localeCompare(a.lastActivity ?? ""));
    return {
      steps: stepCounts(landlords),
      landlords,
      helpRequests: landlords.filter((l) => l.helpRequested).length,
      stuck: landlords.filter((l) => l.stuck).length,
    };
  });
