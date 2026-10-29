/** Weekly comparisons share an identity; hand-written/AI lessons remain independent. */
export function weeklyInsightKey(insight: { evidence?: unknown }): string | null {
  const evidence = insight.evidence;
  if (!evidence || typeof evidence !== "object") return null;
  const e = evidence as Record<string, unknown>;
  if (typeof e.week_end !== "string" || typeof e.dimension !== "string" || typeof e.value !== "string") return null;
  return JSON.stringify([e.week_end, e.dimension, e.value]);
}

/** Input is newest first. Hide superseded copies without deleting any history. */
export function uniqueWeeklyInsights<T extends { evidence?: unknown }>(insights: T[]): T[] {
  const seen = new Set<string>();
  return insights.filter(insight => {
    const key = weeklyInsightKey(insight);
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Incomplete reviews update their summary, never their learned lessons. */
export function shouldPublishWeeklyInsights(missingResults: string[], existing: { missing_results?: string[] } | null): boolean {
  return missingResults.length === 0 && (!existing || (existing.missing_results ?? []).length > 0);
}

/** Carry the newest saved choice forward, including a manually retired/reinstated lesson. */
export function weeklyInsightActive(previous: { active: boolean } | undefined, verdict: string): boolean {
  return previous ? previous.active : verdict !== "too_little_data";
}