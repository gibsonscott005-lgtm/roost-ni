// NI Landlord Compliance & Tenancy Readiness Audit.
// Pure data + scoring. No advice, no verdicts about people — this scores the
// landlord's own paperwork and habits, and names gaps in plain language.

export type AuditArea =
  | "Registration"
  | "Tenancy notice"
  | "Deposit"
  | "Rent receipts"
  | "Safety";

export interface AuditOption {
  /** Stable value stored with the submission. */
  value: string;
  label: string;
  /** 0 = gap, 1 = partial, 2 = in place. */
  points: 0 | 1 | 2;
}

export interface AuditQuestion {
  id: string;
  area: AuditArea;
  question: string;
  help?: string;
  options: AuditOption[];
  /** Shown in the results list when the answer scores below 2. */
  gap: string;
  /** Where in RoostNI this gap is handled. */
  fix: string;
}

const YES_PARTLY_NO = (yes: string, partly: string, no: string): AuditOption[] => [
  { value: "yes", label: yes, points: 2 },
  { value: "partly", label: partly, points: 1 },
  { value: "no", label: no, points: 0 },
];

export const AUDIT_QUESTIONS: AuditQuestion[] = [
  {
    id: "landlord_registration",
    area: "Registration",
    question: "Are you registered with the NI Landlord Registration Scheme?",
    help: "Every private landlord in Northern Ireland must register, and renew every three years. Failing to register can mean a £500 fixed penalty.",
    options: YES_PARTLY_NO("Yes — registered and current", "Not sure / may have lapsed", "No"),
    gap: "Landlord registration isn't confirmed as current.",
    fix: "RoostNI stores your registration number against each property and reminds you before renewal.",
  },
  {
    id: "tenancy_notice",
    area: "Tenancy notice",
    question: "Did your tenant get a written Tenancy Information Notice within 28 days of moving in?",
    help: "Required for private tenancies in Northern Ireland since April 2023.",
    options: YES_PARTLY_NO("Yes — and I kept a copy", "Not sure", "No"),
    gap: "No statutory Tenancy Information Notice on file.",
    fix: "RoostNI generates the notice from the tenancy details and keeps a dated copy for both sides.",
  },
  {
    id: "deposit_scheme",
    area: "Deposit",
    question: "Was the deposit protected with TDS NI or MyDeposits NI within 28 days?",
    help: "The tenant must also receive the scheme's prescribed information within 35 days of the deposit being paid.",
    options: [
      { value: "yes", label: "Yes — protected, and the tenant was told", points: 2 },
      { value: "na", label: "No deposit was taken", points: 2 },
      { value: "partly", label: "Not sure about the dates", points: 1 },
      { value: "no", label: "No", points: 0 },
    ],
    gap: "Deposit protection within the 28-day window can't be evidenced.",
    fix: "RoostNI runs the 28-day countdown, records the scheme and number, and stores the certificate.",
  },
  {
    id: "rent_records",
    area: "Rent receipts",
    question: "Do you give written receipts or keep a record of every rent payment?",
    help: "A written receipt is required for rent paid in cash.",
    options: YES_PARTLY_NO("Yes — every payment recorded", "Bank statements only", "No"),
    gap: "No itemised rent record or receipts you could hand over.",
    fix: "RoostNI keeps a rent ledger, flags arrears and issues receipts.",
  },
  {
    id: "epc_alarms",
    area: "Safety",
    question: "Do you have a valid EPC, and are smoke, heat and carbon monoxide alarms fitted?",
    options: YES_PARTLY_NO("Yes — both in place", "One or the other / not sure", "No"),
    gap: "EPC or alarms not confirmed as in place.",
    fix: "RoostNI's certificate vault tracks expiry dates and reminds you before anything lapses.",
  },
];

export const AUDIT_AREAS: AuditArea[] = [
  "Registration",
  "Tenancy notice",
  "Deposit",
  "Rent receipts",
  "Safety",
];

export type AuditAnswers = Record<string, string>;

export interface AuditResult {
  score: number;
  band: "Well organised" | "Mostly there" | "Some gaps" | "Significant gaps";
  bandNote: string;
  gaps: { area: AuditArea; gap: string; fix: string }[];
  strengths: string[];
  areaScores: { area: AuditArea; score: number }[];
}

function pointsFor(q: AuditQuestion, answers: AuditAnswers): number | null {
  const value = answers[q.id];
  if (!value) return null;
  return q.options.find((o) => o.value === value)?.points ?? null;
}

export function scoreAudit(answers: AuditAnswers): AuditResult {
  let earned = 0;
  let possible = 0;
  const gaps: AuditResult["gaps"] = [];
  const strengths: string[] = [];
  const areaTotals = new Map<AuditArea, { earned: number; possible: number }>();

  for (const q of AUDIT_QUESTIONS) {
    const pts = pointsFor(q, answers);
    if (pts === null) continue;
    earned += pts;
    possible += 2;
    const bucket = areaTotals.get(q.area) ?? { earned: 0, possible: 0 };
    bucket.earned += pts;
    bucket.possible += 2;
    areaTotals.set(q.area, bucket);
    if (pts < 2) gaps.push({ area: q.area, gap: q.gap, fix: q.fix });
    else strengths.push(q.area);
  }

  const score = possible === 0 ? 0 : Math.round((earned / possible) * 100);

  const band: AuditResult["band"] =
    score >= 85
      ? "Well organised"
      : score >= 65
        ? "Mostly there"
        : score >= 40
          ? "Some gaps"
          : "Significant gaps";

  const bandNote =
    band === "Well organised"
      ? "Your paperwork is in good order. The remaining items below are about being able to prove it quickly."
      : band === "Mostly there"
        ? "The core is in place. A handful of documents and dates would be hard to produce at short notice."
        : band === "Some gaps"
          ? "Several things a tenant, a deposit scheme adjudicator or the Landlord Registration Scheme could ask for aren't currently evidenced."
          : "A number of the documents and records an NI tenancy relies on aren't in place yet. Worth working through one at a time.";

  const areaScores = AUDIT_AREAS.map((area) => {
    const bucket = areaTotals.get(area);
    return {
      area,
      score: bucket && bucket.possible > 0 ? Math.round((bucket.earned / bucket.possible) * 100) : 0,
    };
  });

  return { score, band, bandNote, gaps, strengths: [...new Set(strengths)], areaScores };
}

export const PROPERTY_COUNT_OPTIONS = ["1", "2–3", "4–9", "10 or more"];
