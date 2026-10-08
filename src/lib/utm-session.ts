// Keeps campaign tags (utm_*) for the whole browser session so a sign-up or
// audit completed several pages after landing is still credited to the post.
const STORAGE_KEY = "roost_utm";
const KEYS = ["source", "medium", "campaign", "content"] as const;

export type UtmContext = Partial<Record<(typeof KEYS)[number], string>>;

export function captureUtmFromUrl(): void {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const found: UtmContext = {};
    for (const key of KEYS) {
      const value = params.get(`utm_${key}`);
      if (value) found[key] = value.slice(0, 120);
    }
    if (found.campaign || found.source) {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(found));
    }
  } catch {
    /* storage blocked — ignore */
  }
}

export function getEventContext(): UtmContext {
  if (typeof window === "undefined") return {};
  captureUtmFromUrl();
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UtmContext) : {};
  } catch {
    return {};
  }
}
