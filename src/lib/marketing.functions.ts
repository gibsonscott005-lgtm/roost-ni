import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MARKETING_KNOWLEDGE } from "@/lib/marketing-knowledge";
import type { Database } from "@/integrations/supabase/types";

export interface MarketingPost {
  id: string;
  persona: string;
  angle: string;
  topic: string;
  body: string;
  link_url: string | null;
  utm_campaign: string;
  scheduled_for: string;
  status: string;
  posted_at: string | null;
  notes: string | null;
  results: {
    audits?: number;
    alerts?: number;
    signups?: number;
    score?: number;
    refreshed_at?: string;
  };
  created_at: string;
}

export interface MarketingInsight {
  id: string;
  kind: string;
  insight: string;
  active: boolean;
  created_at: string;
}

export interface MarketingEngineData {
  posts: MarketingPost[];
  insights: MarketingInsight[];
}

async function assertAdmin(
  supabase: { from: (t: "profiles") => any },
  userId: string,
) {
  const { data } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", userId)
    .maybeSingle();
  if (!data || data.account_type !== "admin") throw new Error("Forbidden");
}

/** Admin-only: full marketing engine state (post queue + learned insights). */
export const getMarketingEngine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MarketingEngineData> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [postsRes, insightsRes] = await Promise.all([
      supabaseAdmin
        .from("marketing_posts")
        .select(
          "id, persona, angle, topic, body, link_url, utm_campaign, scheduled_for, status, posted_at, notes, results, created_at",
        )
        .order("scheduled_for", { ascending: false })
        .limit(80),
      supabaseAdmin
        .from("marketing_insights")
        .select("id, kind, insight, active, created_at")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    return {
      posts: (postsRes.data ?? []) as unknown as MarketingPost[],
      insights: (insightsRes.data ?? []) as MarketingInsight[],
    };
  });

const generateSchema = z.object({
  focus: z.enum(["mixed", "landlord", "tenant"]).default("mixed"),
  count: z.number().int().min(1).max(5).default(4),
});

interface GeneratedPost {
  persona: string;
  angle: string;
  topic: string;
  body: string;
  link_url: string | null;
}

/** Admin-only: drafts a fresh batch of scheduled posts via the AI gateway. */
export const generateMarketingPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => generateSchema.parse(data ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [recentRes, insightsRes] = await Promise.all([
      supabaseAdmin
        .from("marketing_posts")
        .select("topic, angle, persona, status, results")
        .order("scheduled_for", { ascending: false })
        .limit(25),
      supabaseAdmin
        .from("marketing_insights")
        .select("kind, insight")
        .eq("active", true)
        .limit(15),
    ]);

    const recent = (recentRes.data ?? []) as Array<{
      topic: string;
      angle: string;
      persona: string;
      status: string;
      results: { score?: number; audits?: number; alerts?: number; signups?: number } | null;
    }>;
    const insights = (insightsRes.data ?? []) as Array<{ kind: string; insight: string }>;

    const recentSummary = recent.length
      ? recent
          .map((p) => {
            const r = p.results ?? {};
            const perf =
              p.status === "posted"
                ? ` → score ${r.score ?? 0} (audits ${r.audits ?? 0}, alerts ${r.alerts ?? 0}, sign-ups ${r.signups ?? 0})`
                : " → not posted yet";
            return `- [${p.persona}] "${p.topic}" (angle: ${p.angle})${perf}`;
          })
          .join("\n")
      : "- none yet (first generation)";

    const insightSummary = insights.length
      ? insights.map((i) => `- (${i.kind}) ${i.insight}`).join("\n")
      : "- none learned yet";

    const focusLine =
      data.focus === "mixed"
        ? "Mix landlord and tenant posts roughly evenly across the batch."
        : data.focus === "landlord"
          ? "Every post targets private landlords in Northern Ireland."
          : "Every post targets people looking to rent in Northern Ireland.";

    const prompt = [
      `Draft ${data.count} Facebook posts for RoostNI. ${focusLine}`,
      "",
      "Learned lessons from past performance (obey these):",
      insightSummary,
      "",
      "Recently drafted/posted topics — do NOT repeat or lightly reword these:",
      recentSummary,
      "",
      "Rules:",
      "- Vary the angle across the batch (compliance risk, money saved, time saved, tenant readiness, community trust, legislation explainer).",
      "- Each post needs exactly one CTA URL from the approved list in the system prompt.",
      "- Include the full post text ready to paste: body, blank line, CTA URL on its own line, blank line, hashtags.",
      "- Return ONLY a JSON array, no markdown fences, each item:",
      '  {"persona":"landlord"|"tenant"|"community","angle":"short-kebab-label","topic":"5-10 word summary","body":"full post text with \\n newlines","link_url":"the CTA URL used"}',
    ].join("\n");

    const { createOpenAICompatible } = await import("@ai-sdk/openai-compatible");
    const { streamText } = await import("ai");
    const gateway = createOpenAICompatible({
      name: "lovable",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: process.env["LOVABLE_API_KEY"]!,
    });

    const result = streamText({
      model: gateway("google/gemini-2.5-flash"),
      system: MARKETING_KNOWLEDGE,
      prompt,
      temperature: 0.9,
    });
    const text = await result.text;

    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("The AI returned an unexpected format — try again.");
    }
    const parsed = JSON.parse(text.slice(start, end + 1)) as GeneratedPost[];
    const cleaned = parsed
      .filter((p) => p && typeof p.body === "string" && p.body.trim().length > 40)
      .slice(0, data.count);
    if (cleaned.length === 0) {
      throw new Error("The AI returned no usable posts — try again.");
    }

    // Schedule one post per day at 18:00 UTC (19:00 UK) starting tomorrow.
    const base = new Date();
    base.setUTCDate(base.getUTCDate() + 1);
    base.setUTCHours(18, 0, 0, 0);

    const rows = cleaned.map((p, i) => {
      const when = new Date(base.getTime() + i * 24 * 60 * 60 * 1000);
      const dateSlug = when.toISOString().slice(0, 10);
      const topicSlug = p.topic
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 32);
      return {
        created_by: context.userId,
        persona: ["landlord", "tenant", "community"].includes(p.persona)
          ? p.persona
          : "community",
        angle: String(p.angle ?? "general").slice(0, 60),
        topic: String(p.topic ?? "Untitled post").slice(0, 140),
        body: p.body.trim().slice(0, 4000),
        link_url: typeof p.link_url === "string" ? p.link_url.slice(0, 300) : null,
        utm_campaign: `fb_${dateSlug}_${topicSlug || "post"}_${i}`.slice(0, 90),
        scheduled_for: when.toISOString(),
        status: "scheduled",
      };
    });

    const { data: inserted, error } = await supabaseAdmin
      .from("marketing_posts")
      .insert(rows)
      .select(
        "id, persona, angle, topic, body, link_url, utm_campaign, scheduled_for, status, posted_at, notes, results, created_at",
      );
    if (error) throw new Error(error.message);

    return { created: (inserted ?? []) as unknown as MarketingPost[] };
  });

const updateSchema = z.object({
  id: z.string().uuid(),
  body: z.string().max(4000).optional(),
  topic: z.string().max(140).optional(),
  scheduledFor: z.string().optional(),
  notes: z.string().max(500).optional(),
  status: z.enum(["scheduled", "posted", "skipped", "draft"]).optional(),
});

/** Admin-only: edit a queued post or move it between states. */
export const updateMarketingPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const patch: Database["public"]["Tables"]["marketing_posts"]["Update"] = {};
    if (data.body !== undefined) patch.body = data.body;
    if (data.topic !== undefined) patch.topic = data.topic;
    if (data.notes !== undefined) patch.notes = data.notes;
    if (data.scheduledFor !== undefined) {
      const when = new Date(data.scheduledFor);
      if (Number.isNaN(when.getTime())) throw new Error("Invalid date");
      patch.scheduled_for = when.toISOString();
    }
    if (data.status !== undefined) {
      patch.status = data.status;
      if (data.status === "posted") patch.posted_at = new Date().toISOString();
      if (data.status === "scheduled") patch.posted_at = null;
    }
    if (Object.keys(patch).length === 0) return { ok: true };

    const { error } = await supabaseAdmin
      .from("marketing_posts")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Admin-only: recounts real conversions for every posted campaign from our
 * own database (audits, listing alerts and sign-ups carry the UTM campaign
 * tag), then stores a simple weighted score on each post.
 */
export const refreshMarketingResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: posted } = await supabaseAdmin
      .from("marketing_posts")
      .select("id, utm_campaign")
      .eq("status", "posted")
      .limit(100);

    const posts = (posted ?? []) as Array<{ id: string; utm_campaign: string }>;
    if (posts.length === 0) return { updated: 0 };

    const { data: authData } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 500,
    });
    const users = authData?.users ?? [];

    let updated = 0;
    for (const post of posts) {
      const campaign = post.utm_campaign;
      const [auditsRes, alertsRes] = await Promise.all([
        supabaseAdmin
          .from("compliance_audits")
          .select("id", { count: "exact", head: true })
          .eq("utm->>campaign", campaign),
        supabaseAdmin
          .from("listing_alert_subscribers")
          .select("id", { count: "exact", head: true })
          .eq("utm->>campaign", campaign),
      ]);
      const audits = auditsRes.count ?? 0;
      const alerts = alertsRes.count ?? 0;
      const signups = users.filter(
        (u) =>
          (u.user_metadata as Record<string, unknown> | undefined)?.utm_campaign ===
          campaign,
      ).length;
      const score = audits * 5 + alerts * 3 + signups * 10;

      const { error } = await supabaseAdmin
        .from("marketing_posts")
        .update({
          results: {
            audits,
            alerts,
            signups,
            score,
            refreshed_at: new Date().toISOString(),
          },
        })
        .eq("id", post.id);
      if (!error) updated += 1;
    }

    return { updated };
  });

/**
 * Admin-only: asks the AI to distill durable lessons from scored posts and
 * stores them so the next generation round starts smarter.
 */
export const distillMarketingInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: posted } = await supabaseAdmin
      .from("marketing_posts")
      .select("persona, angle, topic, results, posted_at")
      .eq("status", "posted")
      .order("scheduled_for", { ascending: false })
      .limit(30);

    const scored = ((posted ?? []) as Array<{
      persona: string;
      angle: string;
      topic: string;
      posted_at: string | null;
      results: { score?: number; audits?: number; alerts?: number; signups?: number } | null;
    }>).filter((p) => p.results && typeof p.results.score === "number");

    if (scored.length < 2) {
      throw new Error(
        "Not enough scored posts yet — mark a few posts as posted and refresh results first.",
      );
    }

    const evidence = scored
      .map(
        (p) =>
          `- [${p.persona}] "${p.topic}" (angle: ${p.angle}, posted ${p.posted_at?.slice(0, 10) ?? "?"}) → score ${p.results?.score ?? 0} (audits ${p.results?.audits ?? 0}, alerts ${p.results?.alerts ?? 0}, sign-ups ${p.results?.signups ?? 0})`,
      )
      .join("\n");

    const { createOpenAICompatible } = await import("@ai-sdk/openai-compatible");
    const { streamText } = await import("ai");
    const gateway = createOpenAICompatible({
      name: "lovable",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: process.env["LOVABLE_API_KEY"]!,
    });

    const result = streamText({
      model: gateway("google/gemini-2.5-flash"),
      system: MARKETING_KNOWLEDGE,
      prompt: [
        "Here is the scored performance of recent RoostNI Facebook posts:",
        evidence,
        "",
        "Score weighting: sign-up 10, audit completion 5, listing alert 3. Visitor counts are small, so treat single-post flukes cautiously and favour patterns across 2+ posts.",
        "",
        "Distill 3–5 durable lessons for future posts. Return ONLY a JSON array, no markdown fences:",
        '[{"kind":"win"|"loss","insight":"one specific, actionable sentence"}]',
        '"win" = do more of this, "loss" = stop doing this.',
      ].join("\n"),
      temperature: 0.4,
    });
    const text = await result.text;

    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("The AI returned an unexpected format — try again.");
    }
    const parsed = JSON.parse(text.slice(start, end + 1)) as Array<{
      kind: string;
      insight: string;
    }>;

    const rows = parsed
      .filter((i) => i && typeof i.insight === "string" && i.insight.trim().length > 10)
      .slice(0, 5)
      .map((i) => ({
        kind: i.kind === "loss" ? "loss" : "win",
        insight: i.insight.trim().slice(0, 400),
        evidence: { posts_considered: scored.length },
      }));

    if (rows.length === 0) throw new Error("No usable insights came back — try again.");

    const { error } = await supabaseAdmin.from("marketing_insights").insert(rows);
    if (error) throw new Error(error.message);
    return { created: rows.length };
  });

/** Admin-only: retire or reinstate a learned insight. */
export const setMarketingInsightActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), active: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("marketing_insights")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Build the paste-ready text for a post, with UTM tags on the CTA link. */
export function buildShareText(post: MarketingPost): string {
  let text = post.body;
  if (post.link_url && !post.body.includes(post.link_url)) {
    const joiner = post.link_url.includes("?") ? "&" : "?";
    const tracked = `${post.link_url}${joiner}utm_source=facebook&utm_medium=social&utm_campaign=${post.utm_campaign}`;
    text = `${post.body}\n\n${tracked}`;
  }
  return text;
}
