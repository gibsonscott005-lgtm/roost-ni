import { FOUNDING_LANDLORD_LIMIT, FOUNDING_PLAN, STANDARD_PLAN, formatGBP } from "./pricing";

/** Robin's weekly plan: 5 posts, at least 3 landlord problems, 1 founding places, 1 how to list. */
export type PostType = "landlord_problem" | "founding_places" | "how_to_list";
export const WEEKLY_PLAN: PostType[] = ["landlord_problem", "founding_places", "landlord_problem", "how_to_list", "landlord_problem"];
export const TOPIC_COOLDOWN_DAYS = 14;
export const TENANT_TIP_WINDOW = 5;

export function foundingPlacesLeft(landlordsWhoListed: number): number {
  return Math.max(0, FOUNDING_LANDLORD_LIMIT - Math.max(0, Math.floor(landlordsWhoListed)));
}

/** Exact founding offer wording Robin may use. */
export function foundingOfferLine(placesLeft: number): string {
  const f = FOUNDING_PLAN, s = STANDARD_PLAN;
  return `${placesLeft} of ${FOUNDING_LANDLORD_LIMIT} founding places left. First 20 landlords who list a property: first month free, then ${formatGBP(f.firstHomePence)} for the first home and ${formatGBP(f.extraHomePence)} for each extra, capped at ${formatGBP(f.capPence)}, locked for 24 months. After that: ${formatGBP(s.firstHomePence)} and ${formatGBP(s.extraHomePence)}, capped at ${formatGBP(s.capPence)}. No commission on rent. Never any fees for tenants. Statutory tools stay open to everyone. Billing is not switched on yet.`;
}

/** True when one more tenant post would break "at most 1 tenant tip in 5". */
export function tenantTipBlocked(recentPersonas: string[]): boolean {
  return recentPersonas.slice(0, TENANT_TIP_WINDOW - 1).includes("tenant");
}

export function withinCooldown(postedOrDraftedAt: string, now = new Date()): boolean {
  return now.getTime() - new Date(postedOrDraftedAt).getTime() < TOPIC_COOLDOWN_DAYS * 86400000;
}

export interface ResultRow { post_id: string; reach: number; reactions: number; comments: number; shares: number; link_clicks: number }
export const engagement = (r: ResultRow) => r.reactions + r.comments * 2 + r.shares * 3 + r.link_clicks * 3;

export interface ReviewPost { id: string; angle: string; persona: string; group: string; hasLink: boolean; mode: string }
export type Verdict = "win" | "loss" | "too_little_data";
export interface Comparison { dimension: string; value: string; postIds: string[]; avgEngagement: number; avgReach: number; verdict: Verdict }

/** Compare the week by angle, persona, group, link/no link and mode. Needs 2+ posts with results to call a win or loss. */
export function compareWeek(posts: ReviewPost[], results: ResultRow[]): Comparison[] {
  const latest = new Map<string, ResultRow>();
  for (const r of results) latest.set(r.post_id, r);
  const scored = posts.filter(p => latest.has(p.id));
  if (!scored.length) return [];
  const overall = scored.reduce((n, p) => n + engagement(latest.get(p.id)!), 0) / scored.length;
  const dims: [string, (p: ReviewPost) => string][] = [["angle", p => p.angle], ["persona", p => p.persona], ["group", p => p.group], ["link", p => p.hasLink ? "with link" : "no link"], ["mode", p => p.mode]];
  const out: Comparison[] = [];
  for (const [dimension, key] of dims) {
    const buckets = new Map<string, ReviewPost[]>();
    for (const p of scored) buckets.set(key(p), [...(buckets.get(key(p)) ?? []), p]);
    for (const [value, list] of buckets) {
      const avgEngagement = list.reduce((n, p) => n + engagement(latest.get(p.id)!), 0) / list.length;
      const avgReach = list.reduce((n, p) => n + latest.get(p.id)!.reach, 0) / list.length;
      let verdict: Verdict = "too_little_data";
      if (list.length >= 2 && scored.length >= 3 && overall > 0) verdict = avgEngagement >= overall * 1.25 ? "win" : avgEngagement <= overall * 0.75 ? "loss" : "too_little_data";
      out.push({ dimension, value, postIds: list.map(p => p.id), avgEngagement: Math.round(avgEngagement * 10) / 10, avgReach: Math.round(avgReach), verdict });
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
