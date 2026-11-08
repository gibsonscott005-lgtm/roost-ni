/** Returns a usable name, or null when it is blank, only spaces, or the text "undefined"/"null". */
export function cleanName(v: string | null | undefined): string | null {
  const s = (v ?? "").trim();
  if (!s || /^(undefined|null)$/i.test(s)) return null;
  return s;
}

export function firstName(v: string | null | undefined): string | null {
  return cleanName(v)?.split(/\s+/)[0] ?? null;
}

/** Email greeting: "Hi Jane" or "Hi there". */
export function greeting(v: string | null | undefined): string {
  const f = firstName(v);
  return f ? `Hi ${f}` : "Hi there";
}
