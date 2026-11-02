/** Pure rules for tenant listing-alert emails. Kept dependency-free so they are testable. */

export interface AlertListing {
  title: string;
  location: string | null;
  address: string;
  is_test?: boolean | null;
}

export interface AlertSubscriber {
  utm: Record<string, unknown> | null;
  last_alert_sent_at: string | null;
}

/** Test listings never go to real subscribers. */
export function isTestListing(l: AlertListing): boolean {
  return !!l.is_test || l.title.trim().toUpperCase().startsWith("[TEST LISTING");
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Subscribers with no saved area hear about every listing; otherwise the area must appear in the listing's location or address. */
export function matchesArea(l: AlertListing, s: AlertSubscriber): boolean {
  const raw = s.utm?.["alert_area"];
  const area = typeof raw === "string" ? norm(raw) : "";
  if (!area) return true;
  const hay = ` ${norm(`${l.location ?? ""} ${l.address}`)} `;
  return hay.includes(` ${area} `);
}

/** Max one alert email per subscriber per London calendar day. */
export function sentToday(lastSentAt: string | null, now: Date = new Date()): boolean {
  if (!lastSentAt) return false;
  const day = (d: Date) => d.toLocaleDateString("en-GB", { timeZone: "Europe/London" });
  return day(new Date(lastSentAt)) === day(now);
}

/** SHA-256 hex of an email for analytics; raw addresses never leave the server. */
export async function hashEmail(email: string): Promise<string> {
  const bytes = new TextEncoder().encode(email.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
