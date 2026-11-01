// Browser- and server-safe blog helpers.

export const BLOG_BASE = "https://roostni.co.uk";
export const DEFAULT_AUTHOR = "Scott, RoostNI";
export const LONDON = "Europe/London";

export interface ArticleSummary {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  published_at: string;
  content_markdown: string;
}

export interface Article extends ArticleSummary {
  tags: string[];
  author_name: string;
  legal_checked_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  updated_at: string;
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function readingMinutes(markdown: string): number {
  const words = markdown.replace(/[#>*_|`\-[\]()]/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function formatUkDate(value: string | Date): string {
  const d = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00Z`) : new Date(value);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: LONDON }).format(d);
}

function londonOffsetMs(at: Date): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: LONDON, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(at).map((x) => [x.type, x.value]),
  );
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** "2026-11-08T09:00" in London wall-clock time → UTC ISO string. */
export function londonLocalToUtcIso(local: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!m) throw new Error("Choose a date and time");
  const naive = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let guess = naive - londonOffsetMs(new Date(naive));
  guess = naive - londonOffsetMs(new Date(guess));
  return new Date(guess).toISOString();
}

/** UTC ISO → "YYYY-MM-DDTHH:mm" in London wall-clock time (for datetime-local inputs). */
export function utcIsoToLondonLocal(iso: string): string {
  const d = new Date(iso);
  const local = new Date(d.getTime() + londonOffsetMs(d));
  return local.toISOString().slice(0, 16);
}

export type ArticleStatus = "draft" | "scheduled" | "published";
export function articleStatus(published_at: string | null, now = new Date()): ArticleStatus {
  if (!published_at) return "draft";
  return new Date(published_at) > now ? "scheduled" : "published";
}
