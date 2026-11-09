import { FOUNDING_LANDLORD_LIMIT, FOUNDING_PLAN, STANDARD_PLAN, formatGBP } from "./pricing";

/**
 * Robin's weekly plan: 14 loud text-only sign-up posts, 2 a day.
 * 5 pain-to-solution, 3 founding offer, 3 move a tenanted home, 3 what RoostNI does.
 * Index 2k is slot A (a group), 2k+1 is slot B (the RoostNI Page).
 * Legacy types stay in the union so older drafts still read.
 */
export type PostType = "pain_solution" | "founding_offer" | "move_tenanted" | "what_roostni_does"
  | "pain_urgency" | "founder_voice" | "existing_tenancy" | "useful_tip" | "landlord_problem" | "founding_places" | "how_to_list";
export const WEEKLY_PLAN: PostType[] = [
  "pain_solution", "founding_offer",
  "pain_solution", "what_roostni_does",
  "move_tenanted", "pain_solution",
  "founding_offer", "what_roostni_does",
  "move_tenanted", "pain_solution",
  "what_roostni_does", "founding_offer",
  "move_tenanted", "pain_solution",
];
/** Paused, not deleted: switch back on by removing from this list and adding to WEEKLY_PLAN. */
export const PAUSED_POST_TYPES: PostType[] = ["useful_tip"];
export const POST_TYPE_LABELS: Partial<Record<PostType, string>> = {
  pain_solution: "pain to RoostNI fix", founding_offer: "founding offer", move_tenanted: "move a tenanted home", what_roostni_does: "what RoostNI does",
};
/** Public entry into "I already have a tenant": sign in as landlord, then the add-a-home form set to tenanted. */
export const TENANTED_ENTRY_URL = "https://roostni.co.uk/auth?role=landlord&next=%2Fdashboard%3Fadd%3Dtenanted";
export const LIST_ENTRY_URL = "https://roostni.co.uk/list-property";
/** The only call to action each post may end with; the link sits in the first comment. */
export function callToAction(type: PostType): { cta: string; link: string } {
  if (type === "founding_offer") return { cta: "Claim a founding place:", link: LIST_ENTRY_URL };
  if (type === "move_tenanted") return { cta: "Add your first home:", link: TENANTED_ENTRY_URL };
  return { cta: "Add your first home:", link: LIST_ENTRY_URL };
}
export const POSTS_PER_DAY = 2;
export const TOPIC_COOLDOWN_DAYS = 14;
export const TENANT_TIP_WINDOW = 5;

export function foundingPlacesLeft(landlordsWhoListed: number): number {
  return Math.max(0, FOUNDING_LANDLORD_LIMIT - Math.max(0, Math.floor(landlordsWhoListed)));
}

/** Exact founding offer wording Robin may use. */
export function foundingOfferLine(placesLeft: number | null): string {
  const f = FOUNDING_PLAN, s = STANDARD_PLAN;
  const count = placesLeft === null ? "" : `${placesLeft} of ${FOUNDING_LANDLORD_LIMIT} founding places left. `;
  return `${count}First ${FOUNDING_LANDLORD_LIMIT} landlords who add a home (tenanted or not): first month free from the day they add a home, then ${formatGBP(f.firstHomePence)} for the first home and ${formatGBP(f.extraHomePence)} for each extra, capped at ${formatGBP(f.capPence)}, locked for 24 months. After that: ${formatGBP(s.firstHomePence)} and ${formatGBP(s.extraHomePence)}, capped at ${formatGBP(s.capPence)}. No commission on rent. Never any fees for tenants. Statutory tools stay open to everyone. Billing is not switched on yet.`;
}

/** Short founding line every founding post carries word for word. */
export const FOUNDING_SHORT_LINE = "First 20 landlords who add a home, tenanted or not: first month free, then £5 first home, £3 each extra, locked for 24 months.";

export const BILLING_LINE = "Billing is not switched on yet.";
/** Features that really exist and may be named in a post's what-it-does line (inventories deliberately left out). */
export const POST_FEATURES: [string, RegExp][] = [
  ["Tenant Passport", /tenant passport/i], ["rent records", /rent records?/i], ["deposit reminders", /deposit reminders?/i],
  ["tenancy information notice reminders", /tenancy information notice reminders?/i], ["landlord registration reminders", /(?:landlord )?registration reminders?/i],
  ["repair and maintenance records", /(?:repair|maintenance)(?: and maintenance)? records?/i], ["public NI listings", /(?:public )?(?:NI )?listings?/i],
  ["applicant inbox", /applicant inbox/i], ["statutory tools", /statutory tools?|notice to quit calculator|rent receipts?|health check|\baudit\b/i],
];
export const featuresIn = (line: string) => POST_FEATURES.filter(([, re]) => re.test(line)).map(([n]) => n);
/** The post's what-it-does line: the first line naming RoostNI and at least one real feature. */
export function whatItDoesLine(body: string): string | null {
  return body.split("\n").map(l => l.trim()).find(l => /RoostNI/.test(l) && featuresIn(l).length > 0) ?? null;
}
export const normaliseLine = (l: string) => l.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
/** Within a week no two posts share a what-it-does line, and none reuses a line from earlier posts. */
export function repeatedLineProblems(bodies: string[], earlierBodies: string[]): number[] {
  const earlier = new Set(earlierBodies.flatMap(b => b.split("\n")).map(normaliseLine).filter(Boolean));
  const seen = new Set<string>(); const bad: number[] = [];
  bodies.forEach((b, i) => { const l = whatItDoesLine(b); if (!l) return; const n = normaliseLine(l); if (seen.has(n) || earlier.has(n)) bad.push(i); seen.add(n); });
  return bad;
}
/** Body words, not counting the call to action, the founding offer line or the billing line. */
export function bodyWordCount(body: string): number {
  return body.split("\n").map(l => l.trim()).filter(l => l && l !== FOUNDING_SHORT_LINE && l !== BILLING_LINE && !/^(Add your first home|Claim a founding place)\b/.test(l))
    .join(" ").split(/\s+/).filter(Boolean).length;
}
export const MAX_BODY_WORDS = 60;
/** Which plan slots take the "run it yourself" angle: 2 of the 5 pain posts and 1 of the 3 tenanted posts. */
export function runItYourselfSlots(plan: PostType[] = WEEKLY_PLAN): boolean[] {
  let pain = 0, tenanted = 0;
  return plan.map(t => t === "pain_solution" ? ++pain <= 2 : t === "move_tenanted" ? ++tenanted <= 1 : false);
}
export const TENANTED_TIME_LINE = "About 10 days to complete the records, with reminders along the way.";
/** Adds any required line Robin left out, just above the call to action, so every post carries it word for word. */
export function completeSignupPost(body: string, type: PostType): string {
  const lines = body.trim().split("\n");
  const cta = callToAction(type).cta.replace(/:$/, "");
  let ctaAt = -1; lines.forEach((l, i) => { if (l.trim().startsWith(cta)) ctaAt = i; });
  const add: string[] = [];
  if (type === "founding_offer" && !body.includes(BILLING_LINE)) add.push(BILLING_LINE);
  if (type === "founding_offer" && !body.includes(FOUNDING_SHORT_LINE)) add.push(FOUNDING_SHORT_LINE);
  if (type === "move_tenanted" && !/about 10 days/i.test(body)) add.push(TENANTED_TIME_LINE);
  if (!add.length || ctaAt < 0) return body.trim();
  return [...lines.slice(0, ctaAt), ...add.flatMap(l => [l, ""]), ...lines.slice(ctaAt)].join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** True when one more tenant post would break "at most 1 tenant tip in 5". */
export function tenantTipBlocked(recentPersonas: string[]): boolean {
  return recentPersonas.slice(0, TENANT_TIP_WINDOW - 1).includes("tenant");
}

export function withinCooldown(postedOrDraftedAt: string, now = new Date()): boolean {
  return now.getTime() - new Date(postedOrDraftedAt).getTime() < TOPIC_COOLDOWN_DAYS * 86400000;
}

/** Sign-up checks for the weekly posts. Returns problems; empty means the post may be saved. */
export function signupPostProblems(body: string, type: PostType, usesLegalFact: boolean): string[] {
  const p: string[] = [];
  const lines = body.trim().split("\n").map(l => l.trim()).filter(Boolean);
  const last = lines[lines.length - 1] ?? "";
  if (PAUSED_POST_TYPES.includes(type)) p.push("Tip posts are paused.");
  if (!/RoostNI/.test(body)) p.push("Name RoostNI.");
  const what = whatItDoesLine(body);
  if (!what) p.push("Say in one line what RoostNI does, naming 1 to 3 real features.");
  else if (featuresIn(what).length > 3) p.push("Name at most 3 features in the what-it-does line.");
  if (bodyWordCount(body) > MAX_BODY_WORDS) p.push(`Keep the body to ${MAX_BODY_WORDS} words.`);
  if (lines.some(l => /^(?:I[\u2019']m|I am|I[\u2019']d|I will|We[\u2019']re|We are)\b/i.test(l)) || /inviting you|putting RoostNI in front of|introducing RoostNI/i.test(body)) p.push("Open with the hook, not an introduction.");
  if (/\b\d+\s+of\s+20\b|places?\s+(?:left|remain)/i.test(body)) p.push("No places-left count.");
  const cta = callToAction(type).cta.replace(/:$/, "");
  if (!last.startsWith(cta)) p.push(`End with the call to action \"${cta}\".`);
  if (/\?\s*$/.test(last) || /hardest|what do you find|what would you|how do you/i.test(lines.slice(-3).join(" "))) p.push("No closing question.");
  if (/\bI[\u2019']?d\b|\bI would\b/i.test(body)) p.push("No \"I'd\".");
  if (/good practice/i.test(body)) p.push("No \"Good practice\".");
  if (/creative[- ]writing|competition/i.test(body)) p.push("No filler lines.");
  if (/\bsav(?:e|es|ing|ings)\b[^.\n]*(?:£|\d|%)/i.test(body)) p.push("No savings figures.");
  const agentText = body.replace(/\bno agent needed to run it\b/gi, "");
  if (/\bagents?\b|\bagency\b/i.test(agentText)) p.push("No agent-fee claims or comparisons.");
  if (/(?:£|%)[^.\n]*\bfees?\b|\bfees?\b[^.\n]*(?:£|%)/i.test(body)) p.push("No fee figures.");
  if (/viewing slots?|book(?:ing)? (?:a )?viewings?|rent collection|collects? (?:the )?rent|direct debit|online payments?|pay rent (?:online|through)/i.test(body)) p.push("Mentions a feature RoostNI does not have.");
  if (usesLegalFact && !body.includes("General information, not legal advice.")) p.push("Add \"General information, not legal advice.\"");
  if (type === "founding_offer" && !(/\b20\b/.test(body) && /landlords/i.test(body) && body.includes("£5") && body.includes("£3") && /24 months/i.test(body) && /month free/i.test(body))) p.push("Founding posts need: first 20 landlords, first month free, £5 / £3, 24 months.");
  if (type === "move_tenanted" && !/about 10 days/i.test(body)) p.push("Tenanted posts say it takes about 10 days to complete the records.");
  return p;
}

export interface ResultRow { post_id: string; reach: number; reactions: number; comments: number; shares: number; link_clicks: number; follows_gained?: number | null }
/** Follows count as strongly as shares: a follow is the outcome loud posts are for. */
export const engagement = (r: ResultRow) => r.reactions + r.comments * 2 + r.shares * 3 + r.link_clicks * 3 + (r.follows_gained ?? 0) * 3;

export interface ReviewPost { id: string; angle: string; persona: string; group: string; hasLink: boolean; mode: string; postType?: string }
export type Verdict = "win" | "loss" | "too_little_data";
export interface Comparison { dimension: string; value: string; postIds: string[]; avgEngagement: number; avgReach: number; avgFollows: number; avgLinkClicks: number; verdict: Verdict }

/** Compare the week by post type, angle, persona, group, link/no link and mode. Needs 2+ posts with results to call a win or loss. */
export function compareWeek(posts: ReviewPost[], results: ResultRow[]): Comparison[] {
  const latest = new Map<string, ResultRow>();
  for (const r of results) latest.set(r.post_id, r);
  const scored = posts.filter(p => latest.has(p.id));
  if (!scored.length) return [];
  const overall = scored.reduce((n, p) => n + engagement(latest.get(p.id)!), 0) / scored.length;
  const dims: [string, (p: ReviewPost) => string][] = [["post type", p => p.postType ?? "legacy"], ["angle", p => p.angle], ["persona", p => p.persona], ["group", p => p.group], ["link", p => p.hasLink ? "with link" : "no link"], ["mode", p => p.mode]];
  const out: Comparison[] = [];
  for (const [dimension, key] of dims) {
    const buckets = new Map<string, ReviewPost[]>();
    for (const p of scored) buckets.set(key(p), [...(buckets.get(key(p)) ?? []), p]);
    for (const [value, list] of buckets) {
      const avgEngagement = list.reduce((n, p) => n + engagement(latest.get(p.id)!), 0) / list.length;
      const avgReach = list.reduce((n, p) => n + latest.get(p.id)!.reach, 0) / list.length;
      const avgFollows = list.reduce((n, p) => n + (latest.get(p.id)!.follows_gained ?? 0), 0) / list.length;
      const avgLinkClicks = list.reduce((n, p) => n + latest.get(p.id)!.link_clicks, 0) / list.length;
      let verdict: Verdict = "too_little_data";
      if (list.length >= 2 && scored.length >= 3 && overall > 0) verdict = avgEngagement >= overall * 1.25 ? "win" : avgEngagement <= overall * 0.75 ? "loss" : "too_little_data";
      out.push({ dimension, value, postIds: list.map(p => p.id), avgEngagement: Math.round(avgEngagement * 10) / 10, avgReach: Math.round(avgReach), avgFollows: Math.round(avgFollows * 10) / 10, avgLinkClicks: Math.round(avgLinkClicks * 10) / 10, verdict });
    }
  }
  return out;
}

/** Most recent Sunday (UK date) on or before now, as YYYY-MM-DD. */
export function lastSunday(now = new Date()): string {
  const d = new Date(`${new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(now)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}

/** Last Sunday (UK) of a fully finished Mon–Sun week: on a Sunday, the week still running is not reviewed. */
export function lastCompletedSunday(now = new Date()): string {
  const d = new Date(`${new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(now)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - (d.getUTCDay() || 7));
  return d.toISOString().slice(0, 10);
}
