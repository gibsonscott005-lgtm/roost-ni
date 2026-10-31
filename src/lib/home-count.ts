/**
 * Homes are counted by address, never by listing. Pure helpers so the rule is testable.
 */
export function normaliseAddress(address: string | null | undefined): string {
  return (address ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Number of distinct homes in a set of property rows (same address counts once). */
export function countHomesByAddress(rows: { address: string | null; location?: string | null }[]): number {
  const keys = new Set<string>();
  for (const r of rows) {
    const key = normaliseAddress(r.address);
    if (key) keys.add(key);
  }
  return keys.size;
}

/** Landlords who have added at least one home (tenanted or vacant, advertised or not). */
export function landlordsWithAHome(rows: { landlord_id: string; address: string | null }[]): string[] {
  const ids = new Set<string>();
  for (const r of rows) if (normaliseAddress(r.address)) ids.add(r.landlord_id);
  return [...ids];
}
