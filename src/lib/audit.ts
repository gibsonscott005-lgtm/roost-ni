// NI Landlord Compliance & Tenancy Readiness Audit.
// Pure data + scoring. No advice, no verdicts about people — this scores the
// landlord's own paperwork and habits, and names gaps in plain language.

export type AuditArea =
  | "Registration & notices"
  | "Deposit"
  | "Safety certificates"
  | "Rent & records"
  | "Ending a tenancy";

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
  /** Where in Roost this gap is handled. */
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
    area: "Registration & notices",
    question: "Are you registered with the NI Landlord Registration Scheme, with the number to hand?",
    help: "Registration is required for every private landlord in Northern Ireland and must be renewed every three years.",
    options: YES_PARTLY_NO(
      "Yes — registered and I know my number",
      "Registered, but I'd have to go looking for the number",
      "No, or I'm not sure it's still current",
    ),
    gap: "Your landlord registration number isn't immediately to hand.",
    fix: "Roost stores it against each property and puts it on every listing and lease.",
  },
  {
    id: "tenancy_notice",
    area: "Registration & notices",
    question: "Did your current tenant receive a written Tenancy Information Notice?",
    help: "Since April 2023 a landlord must give the tenant written tenancy terms within 28 days of the tenancy starting.",
    options: YES_PARTLY_NO(
      "Yes — written notice given, and I have a copy",
      "They got a tenancy agreement, but not the statutory notice",
      "No, or I'm not sure what that is",
    ),
    gap: "No statutory Tenancy Information Notice on file.",
    fix: "Roost generates the notice from the tenancy details and keeps a dated copy for both sides.",
  },
  {
    id: "written_agreement",
    area: "Registration & notices",
    question: "Is there a signed written tenancy agreement for the current let?",
    options: YES_PARTLY_NO(
      "Yes — signed by both of us, stored safely",
      "There's an agreement, but it's unsigned or I can't find it",
      "No written agreement",
    ),
    gap: "No signed agreement you can produce on demand.",
    fix: "Roost issues an NI agreement (or your own PDF), the tenant signs, you counter-sign, and both keep it.",
  },
  {
    id: "deposit_scheme",
    area: "Deposit",
    question: "Is the deposit lodged with an approved tenancy deposit scheme?",
    help: "A deposit must be protected within 28 days of receipt, and the tenant told which scheme holds it.",
    options: YES_PARTLY_NO(
      "Yes — lodged, and I have the certificate",
      "Lodged, but I couldn't find the certificate quickly",
      "No, I'm holding it myself or I'm not sure",
    ),
    gap: "Deposit protection can't be evidenced with a certificate.",
    fix: "Roost runs the 28-day countdown, records the scheme and number, and stores the certificate for the tenant to see.",
  },
  {
    id: "deposit_timing",
    area: "Deposit",
    question: "Could you prove the deposit was protected inside the 28-day window?",
    options: YES_PARTLY_NO(
      "Yes — I have the dates in writing",
      "Probably, but I'd be reconstructing it from memory",
      "No",
    ),
    gap: "The 28-day protection timeline isn't evidenced.",
    fix: "Roost timestamps when the deposit was received and when it was protected.",
  },
  {
    id: "inventory",
    area: "Deposit",
    question: "Was a dated inventory with photographs agreed at move-in?",
    help: "Without one, deposit deductions at the end are very hard to sustain.",
    options: YES_PARTLY_NO(
      "Yes — room by room, photographed, tenant agreed it",
      "Some notes or photos, but nothing the tenant signed off",
      "No inventory",
    ),
    gap: "No agreed move-in inventory to compare against at the end.",
    fix: "Roost builds the inventory room by room, the tenant signs it off or flags a disagreement, and check-out compares against it.",
  },
  {
    id: "gas_safety",
    area: "Safety certificates",
    question: "If there's a gas appliance, is the annual Gas Safety Record in date?",
    options: [
      { value: "yes", label: "Yes — in date, copy given to the tenant", points: 2 },
      { value: "na", label: "No gas appliances at the property", points: 2 },
      { value: "partly", label: "In date, but the tenant hasn't been given a copy", points: 1 },
      { value: "no", label: "Out of date, or I'd need to check", points: 0 },
    ],
    gap: "Gas safety evidence is out of date or hasn't reached the tenant.",
    fix: "Roost's certificate vault tracks the expiry date, reminds you before it lapses, and shows the tenant their copy.",
  },
  {
    id: "epc",
    area: "Safety certificates",
    question: "Do you have a valid Energy Performance Certificate for the property?",
    help: "An EPC is required before marketing a property to let and is valid for ten years.",
    options: YES_PARTLY_NO(
      "Yes — valid and I know where it is",
      "There is one, but I'm not certain it's still valid",
      "No, or I've never had one done",
    ),
    gap: "EPC missing or of uncertain validity.",
    fix: "Roost stores the EPC against the property with its expiry, and attaches it to the listing.",
  },
  {
    id: "electrical_alarms",
    area: "Safety certificates",
    question: "Are smoke and carbon monoxide alarms fitted, tested and the test recorded?",
    options: YES_PARTLY_NO(
      "Yes — fitted, tested, and the test is written down",
      "Fitted, but testing isn't recorded anywhere",
      "Not fitted, or I don't know",
    ),
    gap: "Alarm testing isn't recorded.",
    fix: "Roost keeps alarm and electrical checks alongside the other certificates, with reminders.",
  },
  {
    id: "rent_records",
    area: "Rent & records",
    question: "Do you keep a rent record showing every payment received?",
    help: "A landlord must provide a rent receipt or statement where rent is paid in cash.",
    options: YES_PARTLY_NO(
      "Yes — a running record, payment by payment",
      "Bank statements only, nothing itemised",
      "No real record",
    ),
    gap: "No itemised rent record you could hand over or use at year end.",
    fix: "Roost keeps a rent schedule and ledger, flags arrears, and issues receipts.",
  },
  {
    id: "repairs_log",
    area: "Rent & records",
    question: "Are repair requests and what you did about them written down?",
    options: YES_PARTLY_NO(
      "Yes — dated requests and dated responses",
      "It's all in texts and WhatsApp somewhere",
      "No record",
    ),
    gap: "Repair history lives in messages rather than a record.",
    fix: "Roost logs each repair with urgency, photos, your notes and the date it was resolved.",
  },
  {
    id: "notice_periods",
    area: "Ending a tenancy",
    question: "Do you know the notice period you'd have to give your current tenant?",
    help: "In Northern Ireland the notice a landlord must give depends on how long the tenancy has run.",
    options: YES_PARTLY_NO(
      "Yes — and I know it depends on the length of the tenancy",
      "Roughly, I'd have to look it up",
      "No",
    ),
    gap: "Notice periods would need looking up under pressure.",
    fix: "Roost works the period out from the tenancy start date and produces a dated notice.",
  },
];

export const AUDIT_AREAS: AuditArea[] = [
  "Registration & notices",
  "Deposit",
  "Safety certificates",
  "Rent & records",
  "Ending a tenancy",
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
