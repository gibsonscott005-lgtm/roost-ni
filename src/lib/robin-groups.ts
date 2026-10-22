import { z } from "zod";

export const groupSchema = z.object({
  id: z.string().min(1).max(60), name: z.string().min(1).max(100),
  places: z.string().max(500), audience: z.string().max(500), worked: z.string().max(1500),
  linkPlacement: z.enum(["in body", "first comment"]), postAs: z.enum(["Page", "personal profile"]),
  weeklyCount: z.number().int().min(1).max(7),
});
export type RobinGroup = z.infer<typeof groupSchema>;
export const DEFAULT_GROUPS: RobinGroup[] = [
  { id: "newtownards-ards", name: "Newtownards & Ards Peninsula", places: "Newtownards, Ards Peninsula, Comber, Donaghadee, Portaferry", audience: "Local renters and self-managing landlords", worked: "Historic owner-reported observations: native posts reached 33–75 views. Treat as context only, not a current claim or conversion evidence.", linkPlacement: "first comment", postAs: "personal profile", weeklyCount: 3 },
  { id: "belfast-community", name: "Belfast community", places: "Belfast, east Belfast, west Belfast, north Belfast, south Belfast", audience: "Local renters and self-managing landlords", worked: "No group-specific results confirmed yet. Do not import claims about other Belfast groups.", linkPlacement: "first comment", postAs: "personal profile", weeklyCount: 3 },
];
export const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export function combinationTag(group: RobinGroup): string {
  return `${slug(group.name).slice(0, 70)}__${slug(group.linkPlacement)}__${slug(group.postAs)}`.slice(0, 120);
}
export interface GroupSnapshot { id: string; name: string; linkPlacement: RobinGroup["linkPlacement"]; postAs: RobinGroup["postAs"] }
export function readGroupSnapshot(notes: string | null): GroupSnapshot | null {
  try { const group = JSON.parse(notes ?? "null")?.group; return group?.id && group?.name ? group : null; } catch { return null; }
}
export function londonSlot(date: string): Date {
  const probe = new Date(`${date}T19:00:00Z`);
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", hourCycle: "h23" }).format(probe));
  return new Date(probe.getTime() - (hour - 19) * 3600000);
}
export function weekSlots(count: number, now = new Date()): Date[] {
  if (!Number.isInteger(count) || count < 1 || count > 7) throw new Error("Choose 1–7 posts per group.");
  const localDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const base = new Date(`${localDate}T12:00:00Z`);
  if (londonSlot(localDate).getTime() <= now.getTime()) base.setUTCDate(base.getUTCDate() + 1);
  return Array.from({ length: count }, (_, i) => {
    const day = new Date(base); day.setUTCDate(day.getUTCDate() + Math.floor(i * 7 / count));
    return londonSlot(day.toISOString().slice(0, 10));
  });
}
export function assertUniqueDrafts(drafts: { body: string; topic: string }[], history: { body: string; topic: string }[] = []): void {
  const normalise = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const bodies = new Set(history.map(p => normalise(p.body)));
  const topics = new Set(history.map(p => normalise(p.topic)));
  for (const draft of drafts) {
    const body = normalise(draft.body), topic = normalise(draft.topic);
    if (bodies.has(body) || topics.has(topic)) throw new Error("Robin repeated a topic or post. No drafts were saved.");
    bodies.add(body); topics.add(topic);
  }
}
export function trackedGroupLink(post: { link_url: string | null; utm_campaign: string; notes: string | null }): string {
  if (!post.link_url) return "";
  const url = new URL(post.link_url);
  const group = readGroupSnapshot(post.notes);
  url.searchParams.set("utm_source", "facebook"); url.searchParams.set("utm_medium", "social"); url.searchParams.set("utm_campaign", post.utm_campaign);
  url.searchParams.delete("utm_content");
  if (group) url.searchParams.set("utm_content", combinationTag(group as RobinGroup));
  return url.toString();
}
export function groupBody(post: { body: string; link_url: string | null; utm_campaign: string; notes: string | null }): string {
  const group = readGroupSnapshot(post.notes);
  const body = post.body.replace(/https?:\/\/\S+/g, "").trim();
  const link = trackedGroupLink(post);
  if (!link || group?.linkPlacement !== "in body") return body;
  // Keep the final discussion question last.
  const lines = body.split("\n"); const question = lines.pop() ?? "";
  return `${lines.join("\n").trim()}\n\n${link}\n\n${question}`;
}
export function combinationResults(posts: { notes: string | null; status: string; results: { audits?: number; alerts?: number; signups?: number } }[]) {
  const totals = new Map<string, { name: string; placement: string; postAs: string; posts: number; audits: number; alerts: number; signups: number }>();
  for (const post of posts) {
    const group = readGroupSnapshot(post.notes); if (!group || post.status !== "posted") continue;
    const key = combinationTag(group as RobinGroup);
    const row = totals.get(key) ?? { name: group.name, placement: group.linkPlacement, postAs: group.postAs, posts: 0, audits: 0, alerts: 0, signups: 0 };
    row.posts++; row.audits += post.results?.audits ?? 0; row.alerts += post.results?.alerts ?? 0; row.signups += post.results?.signups ?? 0; totals.set(key, row);
  }
  return [...totals.values()].sort((a,b) => (b.audits+b.alerts+b.signups)-(a.audits+a.alerts+a.signups));
}