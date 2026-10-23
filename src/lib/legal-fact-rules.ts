export interface LegalFact {
  id: string; topic: string; fact_text: string; source_url: string;
  last_verified_at: string | null; status: string; rejected_at?: string | null; revision: number;
}
export const LEGAL_FACT_MAX_AGE_DAYS = 90;
export function eligibleLegalFacts(facts: LegalFact[], now = Date.now()): LegalFact[] {
  return facts.filter(f => {
    const verified = Date.parse(f.last_verified_at ?? "");
    return f.status === "approved" && !f.rejected_at && Number.isFinite(verified) && verified <= now && verified >= now - 90 * 86400000;
  });
}
export function legalFactCatalogue(facts: LegalFact[]): string {
  return `Only these approved, recently human-verified statements may be used. Copy legal statements EXACTLY, never infer extra duties, periods, exemptions or dates. Include each used statement in legal_statements with its exact source and check before posting. These rules cover bodies, titles, replies and images. If none are listed, give only non-legal practical advice; do not state ANY notice period.\n${facts.map(f => JSON.stringify({ id:f.id, topic:f.topic, statement:f.fact_text, source:f.source_url, verified_at:f.last_verified_at })).join("\n") || "NO APPROVED FACTS."}`;
}
export function assertApprovedStatements<T extends { statement:string; source:string }>(body: string, statements: T[], facts:LegalFact[], now = Date.now()) {
  const eligible = eligibleLegalFacts(facts, now);
  for (const statement of statements) {
    if (!eligible.some(f => f.fact_text === statement.statement && f.source_url === statement.source) || !body.includes(statement.statement)) throw new Error("Legal claim is not an approved fact verified within 90 days. No draft saved.");
  }
  // Do not let an undeclared notice period slip through a non-legal draft.
  const remainder = statements.reduce((text,s) => text.split(s.statement).join(""), body);
  if (/(?:\b(?:\d+|four|eight|twelve|one|two|three|six)\s*[-–]?\s*(?:days?|weeks?|months?)\b)/i.test(remainder) && /notice|quit|evict/i.test(body)) throw new Error("Notice periods must come from individually approved facts.");
  const withoutDisclaimers = remainder
    .replace(/General information, not legal advice\./g, "")
    .replace(/\bnot\s+(?:(?:an?|another|any|extra|additional|further|formal|separate|new)\s+){0,3}(?:legal|statutory|tenancy)\s+(?:requirements?|rules?|duty|duties|obligations?|checklists?)\b/gi, "")
    .replace(/\bnot\s+(?:required by law|legally required|a legal must)\b/gi, "");
  if (/\b(?:must|legally|required by law|statutory|legal duty|legal requirement|entitled|rights?|regulations?|legislation|notice to quit|eviction|deposit cap|deposit protection)\b/i.test(withoutDisclaimers)) throw new Error("Legal wording must be included as an exact approved fact. Use practical advice instead.");
  return statements.map(s => {
    const fact = eligible.find(f => f.fact_text === s.statement && f.source_url === s.source);
    return { ...s, fact_id:fact?.id, verified_at:fact?.last_verified_at, revision:fact?.revision };
  });
}
export function summariseSourceChange(previous:string, current:string): string {
  const oldLines = previous.split("\n").map(s=>s.trim()).filter(Boolean);
  const newLines = current.split("\n").map(s=>s.trim()).filter(Boolean);
  const removed = oldLines.filter(s=>!newLines.includes(s)).slice(0,2).join(" ").slice(0,450);
  const added = newLines.filter(s=>!oldLines.includes(s)).slice(0,2).join(" ").slice(0,450);
  return `Source page changed; this is not a legal conclusion. Removed/changed: ${removed || "None identified"}. Added/changed: ${added || "None identified"}. Check the fact against the current page.`;
}