import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  MARKETING_KNOWLEDGE,
  NI_LEGAL_COOLDOWN_DAYS,
  NI_LEGAL_GUARDRAILS,
  NI_LEGAL_TOPICS,
  type NiLegalTopic,
} from "@/lib/marketing-knowledge";
import type { Database } from "@/integrations/supabase/types";

export interface MarketingPost {
  id: string;
  platform: string;
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
    visits?: number;
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
          "id, platform, persona, angle, topic, body, link_url, utm_campaign, scheduled_for, status, posted_at, notes, results, created_at",
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
  focus: z.enum(["mixed", "landlord", "tenant", "ni_legal", "reddit"]).default("mixed"),
  count: z.number().int().min(1).max(1).default(1),
  brief: z.string().max(6000).optional(),
});

/** Next `n` Monday/Wednesday/Friday dates at 18:00 UTC (19:00 UK), starting today when today's slot is still ahead. */
function nextLegalSlots(n: number): Date[] {
  const out: Date[] = [];
  const d = new Date();
  d.setUTCHours(18, 0, 0, 0);
  if ([1, 3, 5].includes(d.getUTCDay()) && d.getTime() > Date.now()) out.push(new Date(d));
  while (out.length < n) {
    d.setUTCDate(d.getUTCDate() + 1);
    if ([1, 3, 5].includes(d.getUTCDay())) out.push(new Date(d));
  }
  return out;
}

/** Today's 18:00 UTC (19:00 UK) slot if still ahead, otherwise tomorrow's. */
function nextDailySlot(): Date {
  const d = new Date();
  d.setUTCHours(18, 0, 0, 0);
  if (d.getTime() <= Date.now()) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

interface GeneratedPost {
  persona: string;
  angle: string;
  topic: string;
  body: string;
  link_url: string | null;
}

/** Admin-only: drafts a fresh batch of scheduled posts via the AI gateway. */
// ============================================================================
// DAILY_STRATEGY_OVERRIDE
// Paste today's CMO brief between the backticks below. When non-empty it is
// injected at the top of every Facebook and Reddit generation prompt and takes
// priority over the standing strategy (NI law and brand rules still apply).
// Leave it as an empty string to fall back to the master strategy.
// ============================================================================
const DAILY_STRATEGY_OVERRIDE = `
# DAILY_STRATEGY_OVERRIDE: October 12, 2026

THEME: Single Daily Campaign Focus & Strict Limit Enforcement

TARGET AUDIENCE: Self-Managing Landlords & Tenants in Northern Ireland



STRATEGY PARAMETERS:

1. THE PAIN POINT: Robin has been mistakenly outputting 4 posts per week instead of a singular, hyper-focused daily strategy brief. This override explicitly locks Robin to generate exactly ONE acute daily campaign theme and piece of copy per run to prevent content fatigue and maintain high engagement in local NI groups.

2. LAW WRITING INSTRUCTIONS: Enforce strict single-topic NI compliance rules (e.g., Private Tenancies Act (NI) 2022, 28-day rent receipts, or tiered notice periods). Never bundle multiple distinct legal mandates into a single chaotic broadcast.

3. LOCAL GEOGRAPHY HOOK: Anchor the singular daily post to specific local regions like Newtownards, Bangor, or Belfast without information overload.

4. CALL TO ACTION: Direct the single audience segment to the exact relevant conversion link (roostni.co.uk/audit or roostni.co.uk/dashboard/passport) using clean tracked UTM parameters.
`.trim();

function withDailyOverride(prompt: string, brief?: string): string {
  const today = brief?.trim() || DAILY_STRATEGY_OVERRIDE;
  if (!today) return prompt;
  return [
    "## TODAY'S STRATEGY OVERRIDE (highest priority — follow exactly, within NI law and the hard bans)",
    today,
    "",
    prompt,
  ].join("\n");
}

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
      results: { score?: number; visits?: number; audits?: number; alerts?: number; signups?: number } | null;
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

    if (data.focus === "reddit") {
      return generateRedditBatch(supabaseAdmin, context.userId, recent, data.brief);
    }

    const isLegal = data.focus === "ni_legal";
    let legalPicks: NiLegalTopic[] = [];
    if (isLegal) {
      // Topic cooldown: exclude any legal topic used in the last N days, then
      // prefer topics that have gone longest without a post.
      const since = new Date(Date.now() - NI_LEGAL_COOLDOWN_DAYS * 86400000).toISOString();
      const { data: legalHistory } = await supabaseAdmin
        .from("marketing_posts")
        .select("angle, scheduled_for")
        .like("angle", "legal:%")
        .order("scheduled_for", { ascending: false })
        .limit(200);
      const lastUsed = new Map<string, string>();
      for (const row of legalHistory ?? []) {
        const key = row.angle.slice("legal:".length);
        if (!lastUsed.has(key)) lastUsed.set(key, row.scheduled_for);
      }
      const eligible = NI_LEGAL_TOPICS.filter((t) => {
        const used = lastUsed.get(t.key);
        return !used || used < since;
      }).sort((a, b) => (lastUsed.get(a.key) ?? "").localeCompare(lastUsed.get(b.key) ?? ""));
      // Keep one "upcoming change" slot (Friday) when available.
      const upcoming = eligible.filter((t) => t.upcoming);
      const current = eligible.filter((t) => !t.upcoming);
      legalPicks = [current[0] ?? upcoming[0]].filter(
        (t): t is NiLegalTopic => Boolean(t),
      );
      if (legalPicks.length === 0) {
        throw new Error(
          `Every legal topic has been covered in the last ${NI_LEGAL_COOLDOWN_DAYS} days — try again later.`,
        );
      }
    }

    const focusLine =
      data.focus === "mixed"
        ? "Mix landlord and tenant posts roughly evenly across the batch."
        : data.focus === "landlord"
          ? "Every post targets private landlords in Northern Ireland."
          : data.focus === "tenant"
            ? "Every post targets people looking to rent in Northern Ireland."
            : "This is the NI Legal Series: each post explains ONE Northern Ireland legal topic with implications for BOTH landlords and tenants.";

    const legalBlock = isLegal
      ? [
          "",
          NI_LEGAL_GUARDRAILS,
          "",
          `Write exactly ${legalPicks.length} posts, one per topic below, in this order. Use ONLY these facts:`,
          ...legalPicks.map(
            (t, i) =>
              `${i + 1}. key=${t.key} | ${t.title} | Responsible body: ${t.body}${t.upcoming ? " | UPCOMING/PROPOSED" : ""}\n   Facts: ${t.facts}\n   link_url: ${t.cta}`,
          ),
          'Set "persona" to "community" and "angle" to "legal:<key>" exactly.',
        ]
      : [];

    const prompt = [
      `Draft exactly ONE Facebook post for RoostNI, on a single focused topic. ${focusLine}`,
      ...legalBlock,
      "",
      "Learned lessons from past performance (obey these):",
      insightSummary,
      "",
      "Recently drafted/posted topics — do NOT repeat or lightly reword these:",
      recentSummary,
      "",
      "Rules:",
      isLegal
        ? "- Northern Ireland law only; follow the jurisdiction rules above."
        : "- One topic only; never bundle several legal duties into one post.",
      "- Each post needs exactly one CTA URL from the approved list in the system prompt.",
      "- Do NOT paste the CTA URL or any web address inside the body text — the tracked link goes in the first comment. Follow the Facebook GROUP compliance rules: peer tone, end with a discussion question, then \"(Link in the first comment 👇)\", then max 4 hashtags.",
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
      prompt: withDailyOverride(prompt, data.brief),
      temperature: 0.9,
    });
    const text = await result.text;

    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("The AI returned an unexpected format — try again.");
    }
    const parsed = JSON.parse(text.slice(start, end + 1)) as GeneratedPost[];
    const maxCount = isLegal ? legalPicks.length : data.count;
    const cleaned = parsed
      .filter((p) => p && typeof p.body === "string" && p.body.trim().length > 40)
      .slice(0, maxCount);
    if (cleaned.length === 0) {
      throw new Error("The AI returned no usable posts — try again.");
    }

    // Legal series: Mon/Wed/Fri. Otherwise one post per day. 18:00 UTC.
    const base = nextDailySlot();

    const rows = cleaned.map((p, i) => {
      const when = isLegal
        ? base
        : new Date(base.getTime() + i * 24 * 60 * 60 * 1000);
      const dateSlug = when.toISOString().slice(0, 10);
      // Force the topic key from our own pick so the cooldown is reliable.
      const legalTopic = isLegal ? legalPicks[i] : undefined;
      const topicSlug = (legalTopic?.key ?? p.topic)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 32);
      return {
        created_by: context.userId,
        persona: legalTopic
          ? "community"
          : ["landlord", "tenant", "community"].includes(p.persona)
            ? p.persona
            : "community",
        angle: legalTopic ? `legal:${legalTopic.key}` : String(p.angle ?? "general").slice(0, 60),
        topic: String(p.topic ?? legalTopic?.title ?? "Untitled post").slice(0, 140),
        body: p.body.trim().slice(0, 4000),
        link_url: legalTopic
          ? legalTopic.cta
          : typeof p.link_url === "string"
            ? p.link_url.slice(0, 300)
            : null,
        utm_campaign: `fb_${dateSlug}_${topicSlug || "post"}_${i}`.slice(0, 90),
        scheduled_for: when.toISOString(),
        status: "scheduled",
      };
    });

    const { data: inserted, error } = await supabaseAdmin
      .from("marketing_posts")
      .insert(rows)
      .select(
        "id, platform, persona, angle, topic, body, link_url, utm_campaign, scheduled_for, status, posted_at, notes, results, created_at",
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
      const [auditsRes, alertsRes, visitsRes] = await Promise.all([
        supabaseAdmin
          .from("compliance_audits")
          .select("id", { count: "exact", head: true })
          .eq("utm->>campaign", campaign),
        supabaseAdmin
          .from("listing_alert_subscribers")
          .select("id", { count: "exact", head: true })
          .eq("utm->>campaign", campaign),
        supabaseAdmin
          .from("marketing_visits")
          .select("id", { count: "exact", head: true })
          .eq("utm_campaign", campaign),
      ]);
      const visits = visitsRes.count ?? 0;
      const audits = auditsRes.count ?? 0;
      const alerts = alertsRes.count ?? 0;
      const signups = users.filter(
        (u) =>
          (u.user_metadata as Record<string, unknown> | undefined)?.utm_campaign ===
          campaign,
      ).length;
      const score = visits + audits * 5 + alerts * 3 + signups * 10;

      const { error } = await supabaseAdmin
        .from("marketing_posts")
        .update({
          results: {
            visits,
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
      results: { score?: number; visits?: number; audits?: number; alerts?: number; signups?: number } | null;
    }>).filter((p) => p.results && typeof p.results.score === "number");

    if (scored.length < 2) {
      throw new Error(
        "Not enough scored posts yet — mark a few posts as posted and refresh results first.",
      );
    }

    const evidence = scored
      .map(
        (p) =>
          `- [${p.persona}] "${p.topic}" (angle: ${p.angle}, posted ${p.posted_at?.slice(0, 10) ?? "?"}) → score ${p.results?.score ?? 0} (visits ${p.results?.visits ?? 0}, audits ${p.results?.audits ?? 0}, alerts ${p.results?.alerts ?? 0}, sign-ups ${p.results?.signups ?? 0})`,
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
  if (!post.link_url) return post.body;
  // Older drafts may carry hand-added UTM tags in the stored link itself —
  // strip them so the post's own campaign tag is the only one applied.
  let cleanLink = post.link_url;
  try {
    const u = new URL(post.link_url);
    u.searchParams.delete("utm_source");
    u.searchParams.delete("utm_medium");
    u.searchParams.delete("utm_campaign");
    cleanLink = u.toString();
  } catch {
    // not a parseable URL — use as-is
  }
  const joiner = cleanLink.includes("?") ? "&" : "?";
  const tracked = `${cleanLink}${joiner}utm_source=facebook&utm_medium=social&utm_campaign=${post.utm_campaign}`;
  // The generator usually embeds the CTA URL in the body — swap every
  // occurrence for the tracked URL, stripping any query string already
  // attached (older drafts carry hand-added UTM tags). Only append when
  // the body lacks the link entirely.
  const escaped = cleanLink.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const urlPattern = new RegExp(`${escaped}(\\?\\S*)?`, "g");
  if (urlPattern.test(post.body)) {
    return post.body.replace(urlPattern, tracked);
  }
  return `${post.body}\n\n${tracked}`;
}

/** Strips any URLs/web addresses so group Admin Assist filters don't hold the post. */
export function buildGroupPostText(post: MarketingPost): string {
  let body = post.body
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\b(www\.)?roostni\.co\.uk\S*/gi, "RoostNI")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (post.link_url && !/first comment/i.test(body)) {
    body = `${body}\n\n(Link in the first comment 👇)`;
  }
  return body;
}

/** The first comment carrying the campaign-tracked link. */
export function buildFirstCommentText(post: MarketingPost): string {
  if (!post.link_url) return "";
  const full = buildShareText({ ...post, body: "" }).trim();
  return `Here's the link mentioned above: ${full}`;
}

const REDDIT_RULES = [
  "You are drafting posts for r/nirenting, a Reddit community about renting in Northern Ireland, owned and moderated by the RoostNI founder.",
  "Reddit rules: long-form, genuinely useful, plain-spoken British English. No hashtags, no emojis, no marketing hype, no 'game-changer'.",
  "Use Reddit Markdown: short intro, ## headings or **bold** labels, bullet lists, a short 'TL;DR' line at the end.",
  "Northern Ireland law only. Never cite English frameworks (ASTs, Section 21/8, Right to Rent, Renters' Rights Act, five-week deposit cap). Deposits: TDS Northern Ireland or MyDeposits Northern Ireland only.",
  "Include the line: 'General information only, not legal advice — check nidirect.gov.uk for the current rules.'",
  "Mix formats across the batch: practical guides, myth-busters (NI vs England), discussion questions that invite people to share experiences, and scenario questions.",
  "Mention RoostNI at most once, humbly, at the very end (e.g. 'I help run RoostNI, a free NI renting tool — the [checklist](LINK) might help.'), and use the literal placeholder LINK for the URL. Discussion-only posts may omit RoostNI entirely and set link_url to null.",
  "Never say 'vetting'. RoostNI organises self-certified applicant evidence; it is not an agent or a legal service. It is free during the open beta.",
].join("\n");

async function generateRedditBatch(
  supabaseAdmin: any,
  userId: string,
  recent: Array<{ topic: string; angle: string }>,
  brief?: string,
) {
  const count = 1;
  const prompt = [
    `Draft exactly ONE Reddit post for today, on a single focused topic.`,
    "",
    "Recent topics — do NOT repeat:",
    recent.map((r) => `- ${r.topic} (${r.angle})`).join("\n") || "- none",
    "",
    "Return ONLY a JSON array, no fences, each item:",
    '{"persona":"landlord"|"tenant"|"community","angle":"short-kebab-label","title":"Reddit post title, max 200 chars, no clickbait","body":"markdown body with \\n newlines","link_url":"approved RoostNI URL or null"}',
  ].join("\n");

  const { createOpenAI } = await import("@ai-sdk/openai");
  const { streamText } = await import("ai");
  const openai = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: process.env["LOVABLE_API_KEY"]!,
    headers: { "Lovable-API-Key": process.env["LOVABLE_API_KEY"]!, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const result = streamText({
    model: openai.responses("openai/gpt-6-astra"),
    system: `${MARKETING_KNOWLEDGE}\n\n${REDDIT_RULES}`,
    prompt: withDailyOverride(prompt, brief),
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  const text = await result.text;
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end <= start) throw new Error("The AI returned an unexpected format — try again.");
  const parsed = JSON.parse(text.slice(start, end + 1)) as Array<{
    persona?: string; angle?: string; title?: string; body?: string; link_url?: string | null;
  }>;
  const cleaned = parsed
    .filter((p) => p && typeof p.body === "string" && p.body.trim().length > 80 && typeof p.title === "string")
    .slice(0, count);
  if (cleaned.length === 0) throw new Error("The AI returned no usable posts — try again.");

  const base = nextDailySlot();
  const rows = cleaned.map((p, i) => {
    const when = new Date(base.getTime() + i * 86400000);
    const slug = String(p.angle ?? p.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32);
    return {
      created_by: userId,
      platform: "reddit",
      persona: ["landlord", "tenant", "community"].includes(p.persona ?? "") ? p.persona! : "community",
      angle: String(p.angle ?? "reddit").slice(0, 60),
      topic: p.title!.trim().slice(0, 140),
      body: p.body!.trim().slice(0, 4000),
      link_url: typeof p.link_url === "string" && p.link_url.startsWith("http") ? p.link_url.slice(0, 300) : null,
      utm_campaign: `rd_${when.toISOString().slice(0, 10)}_${slug || "post"}_${i}`.slice(0, 90),
      scheduled_for: when.toISOString(),
      status: "scheduled",
    };
  });
  const { data: inserted, error } = await supabaseAdmin
    .from("marketing_posts")
    .insert(rows)
    .select("id, platform, persona, angle, topic, body, link_url, utm_campaign, scheduled_for, status, posted_at, notes, results, created_at");
  if (error) throw new Error(error.message);
  return { created: (inserted ?? []) as unknown as MarketingPost[] };
}

/** Reddit body with the LINK placeholder (or a trailing line) swapped for the tracked URL. */
export function buildRedditBody(post: MarketingPost): string {
  if (!post.link_url) return post.body.replace(/\(LINK\)/g, "").replace(/\bLINK\b/g, "");
  let clean = post.link_url;
  try {
    const u = new URL(post.link_url);
    ["utm_source", "utm_medium", "utm_campaign"].forEach((k) => u.searchParams.delete(k));
    clean = u.toString();
  } catch { /* use as-is */ }
  const tracked = `${clean}${clean.includes("?") ? "&" : "?"}utm_source=reddit&utm_medium=post&utm_campaign=${post.utm_campaign}`;
  if (/\bLINK\b/.test(post.body)) return post.body.replace(/\bLINK\b/g, tracked);
  return `${post.body}\n\n[Free NI tool on RoostNI](${tracked})`;
}
