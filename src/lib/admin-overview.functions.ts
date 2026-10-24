import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface AdminSignUp {
  id: string;
  full_name: string;
  account_type: string;
  hear_about_us: string | null;
  created_at: string;
  email: string | null;
}

export interface AdminAudit {
  id: string;
  created_at: string;
  score: number;
  band: string;
  email: string | null;
  contact_name: string | null;
  property_count: string | null;
  gaps: string[];
}

export interface AdminFeedback {
  id: string;
  created_at: string;
  category: string;
  message: string;
  status: string;
  page_path: string | null;
  account_type: string | null;
  user_id: string;
  author: string | null;
}

export interface AdminAlertSubscriber {
  id: string;
  email: string;
  created_at: string;
}

export interface AdminOverview {
  totals: {
    tenants: number;
    landlords: number;
    signUpsLast7Days: number;
    audits: number;
    auditsWithEmail: number;
    averageScore: number | null;
    listingsLive: number;
    listingsTenanted: number;
    listingsVacant: number;
    applications: number;
    openFeedback: number;
    passports: number;
    alertSubscribers: number;
  };
  signUps: AdminSignUp[];
  audits: AdminAudit[];
  feedback: AdminFeedback[];
  alertSubscribers: AdminAlertSubscriber[];
}

async function assertAdmin(supabase: {
  from: (t: "profiles") => {
    select: (c: string) => {
      eq: (
        col: string,
        val: string,
      ) => { maybeSingle: () => Promise<{ data: { account_type: string } | null }> };
    };
  };
}, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", userId)
    .maybeSingle();
  if (!data || data.account_type !== "admin") throw new Error("Forbidden");
}

/**
 * Admin-only aggregate view of beta activity. The caller's admin role is
 * verified through their own RLS-scoped profile row before any privileged
 * read happens.
 */
export const getAdminOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminOverview> => {
    await assertAdmin(context.supabase as never, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [profilesRes, auditsRes, listingsRes, sharesRes, feedbackRes, passportsRes, usersRes, alertsRes] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("id, full_name, account_type, hear_about_us, created_at")
          .order("created_at", { ascending: false })
          .limit(500),
        supabaseAdmin
          .from("compliance_audits")
          .select("id, created_at, score, band, email, contact_name, property_count, gaps")
          .order("created_at", { ascending: false })
          .limit(200),
        supabaseAdmin
          .from("property_listings")
          .select("id, is_published, occupancy_status")
          .limit(1000),
        supabaseAdmin.from("passport_shares").select("id").limit(1000),
        supabaseAdmin
          .from("beta_feedback")
          .select("id, created_at, category, message, status, page_path, account_type, user_id")
          .order("created_at", { ascending: false })
          .limit(200),
        supabaseAdmin.from("tenant_passports").select("id").limit(1000),
        supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 500 }),
        supabaseAdmin
          .from("listing_alert_subscribers" as never)
          .select("id, email, created_at")
          .order("created_at", { ascending: false })
          .limit(500),
      ]);

    const emailById = new Map<string, string | null>(
      (usersRes.data?.users ?? []).map((u) => [u.id, u.email ?? null]),
    );
    const allProfiles = profilesRes.data ?? [];
    // Hide test activity: example.com addresses and anything by admin accounts.
    const isTestEmail = (e: string | null | undefined) =>
      !!e && /@example\.(com|org|net)$/i.test(e.trim());
    const adminIds = new Set(
      allProfiles.filter((p) => p.account_type === "admin").map((p) => p.id),
    );
    const adminEmails = new Set(
      [...adminIds].map((id) => emailById.get(id)?.toLowerCase()).filter(Boolean) as string[],
    );
    const testIds = new Set(
      allProfiles
        .filter((p) => adminIds.has(p.id) || isTestEmail(emailById.get(p.id)))
        .map((p) => p.id),
    );
    const isTestAddr = (e: string | null | undefined) =>
      isTestEmail(e) || (!!e && adminEmails.has(e.trim().toLowerCase()));
    const profiles = allProfiles.filter((p) => !testIds.has(p.id));
    const nameById = new Map(allProfiles.map((p) => [p.id, p.full_name]));
    const audits = (auditsRes.data ?? []).filter((a) => !isTestAddr(a.email));
    const listings = listingsRes.data ?? [];
    const feedback = feedbackRes.data ?? [];
    const alertSubscribers = ((alertsRes.data ?? []) as AdminAlertSubscriber[]).filter(
      (s) => !isTestAddr(s.email),
    );

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const scores = audits.map((a) => a.score);

    return {
      totals: {
        tenants: profiles.filter((p) => p.account_type === "tenant").length,
        landlords: profiles.filter((p) => p.account_type === "landlord").length,
        signUpsLast7Days: profiles.filter((p) => new Date(p.created_at).getTime() >= weekAgo).length,
        audits: audits.length,
        auditsWithEmail: audits.filter((a) => !!a.email).length,
        averageScore: scores.length
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : null,
        listingsLive: listings.filter((l) => l.is_published).length,
        listingsTenanted: listings.filter((l) => l.occupancy_status === "tenanted").length,
        listingsVacant: listings.filter((l) => l.occupancy_status !== "tenanted" && !l.is_published)
          .length,
        applications: (sharesRes.data ?? []).length,
        openFeedback: feedback.filter((f) => f.status === "open").length,
        passports: (passportsRes.data ?? []).length,
        alertSubscribers: alertSubscribers.length,
      },
      signUps: profiles.slice(0, 100).map((p) => ({
        id: p.id,
        full_name: p.full_name,
        account_type: p.account_type,
        hear_about_us: p.hear_about_us,
        created_at: p.created_at,
        email: emailById.get(p.id) ?? null,
      })),
      audits: audits.map((a) => ({
        id: a.id,
        created_at: a.created_at,
        score: a.score,
        band: a.band,
        email: a.email,
        contact_name: a.contact_name,
        property_count: a.property_count,
        gaps: (a.gaps as string[] | null) ?? [],
      })),
      feedback: feedback.map((f) => ({
        id: f.id,
        created_at: f.created_at,
        category: f.category,
        message: f.message,
        status: f.status,
        page_path: f.page_path,
        account_type: f.account_type,
        user_id: f.user_id,
        author: nameById.get(f.user_id) ?? null,
      })),
      alertSubscribers,
    };
  });

/** Admin-only status change on a beta feedback row. */
export const setFeedbackStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: "open" | "resolved" | "closed" }) => {
    if (!input?.id || !["open", "resolved", "closed"].includes(input.status)) {
      throw new Error("Invalid input");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("beta_feedback")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
