/**
 * End-of-tenancy rules for Northern Ireland.
 *
 * Notice to Quit periods come from the Private Tenancies Act (Northern Ireland)
 * 2022 and are worked out from how long the tenancy has run at the date the
 * notice is served. Roost calculates and documents — it never advises on
 * possession, which only a court can order.
 */

export type NoticeParty = "landlord" | "tenant";

export const NI_LEGAL_DISCLAIMER =
  "Roost prepares this notice from the tenancy details you have entered. It is not legal advice. Only a court can order possession of a property in Northern Ireland.";

export const DEPOSIT_RETURN_DAYS = 28;

/** Whole months between two dates. */
function monthsBetween(from: Date, to: Date) {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return Math.max(0, months);
}

export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toISODate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addWeeks(d: Date, weeks: number) {
  const next = new Date(d.getTime());
  next.setDate(next.getDate() + weeks * 7);
  return next;
}

export function formatDate(value: string | Date | null | undefined) {
  const d = value instanceof Date ? value : parseDate(value as string | null);
  return d
    ? d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "—";
}

export interface NoticeRule {
  weeks: number;
  /** Plain-English basis for the period, shown to the user. */
  basis: string;
}

/**
 * Statutory minimum notice, by who is serving and how long the tenancy has run
 * at the date of service.
 *
 * Landlord serving tenant:  <= 12 months  -> 4 weeks
 *                           <= 10 years   -> 8 weeks
 *                           >  10 years   -> 12 weeks
 * Tenant serving landlord:  <= 10 years   -> 4 weeks
 *                           >  10 years   -> 12 weeks
 */
export function noticeRule(
  party: NoticeParty,
  tenancyStart: string | null | undefined,
  servedOn: string,
): NoticeRule {
  const start = parseDate(tenancyStart);
  const served = parseDate(servedOn) ?? new Date();
  const months = start ? monthsBetween(start, served) : 0;

  if (party === "tenant") {
    if (months > 120)
      return { weeks: 12, basis: "Tenancy has run for more than 10 years — 12 weeks' notice." };
    return { weeks: 4, basis: "Tenancy has run for 10 years or less — 4 weeks' notice." };
  }

  if (months > 120)
    return { weeks: 12, basis: "Tenancy has run for more than 10 years — 12 weeks' notice." };
  if (months > 12)
    return {
      weeks: 8,
      basis:
        "Tenancy has run for more than 12 months but not more than 10 years — 8 weeks' notice.",
    };
  return { weeks: 4, basis: "Tenancy has run for 12 months or less — 4 weeks' notice." };
}

/** Earliest date the tenancy can legally end for a notice served on `servedOn`. */
export function earliestEndDate(
  party: NoticeParty,
  tenancyStart: string | null | undefined,
  servedOn: string,
) {
  const served = parseDate(servedOn) ?? new Date();
  const { weeks } = noticeRule(party, tenancyStart, servedOn);
  return toISODate(addWeeks(served, weeks));
}

export function daysUntil(value: string | null | undefined) {
  const d = parseDate(value);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

export function depositDeadline(endDate: string | null | undefined) {
  const d = parseDate(endDate);
  if (!d) return null;
  d.setDate(d.getDate() + DEPOSIT_RETURN_DAYS);
  return toISODate(d);
}

export const FINAL_CONDITIONS = [
  "Same as move-in",
  "Fair wear and tear",
  "Damage — tenant",
  "Damage — landlord to repair",
  "Cleaning required",
  "Missing",
] as const;

export type TenancyStage = "active" | "notice_served" | "ended" | "completed";

export const TENANCY_STAGE_LABEL: Record<TenancyStage, string> = {
  active: "Active tenancy",
  notice_served: "Notice served",
  ended: "Tenancy ended",
  completed: "Completed",
};

export interface DeductionLine {
  reason: string;
  amount: number;
}

export function parseDeductions(value: unknown): DeductionLine[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      const r = row as { reason?: unknown; amount?: unknown };
      return { reason: String(r?.reason ?? ""), amount: Number(r?.amount ?? 0) || 0 };
    })
    .filter((r) => r.reason.trim() || r.amount);
}

export function deductionsTotal(lines: DeductionLine[]) {
  return lines.reduce((sum, l) => sum + (Number.isFinite(l.amount) ? l.amount : 0), 0);
}

/* ------------------------------------------------------------------ */
/* Shared stage model                                                  */
/* ------------------------------------------------------------------ */

export type EndStageKey =
  | "active"
  | "notice_served"
  | "notice_acknowledged"
  | "inspection"
  | "inspection_reviewed"
  | "settlement_proposed"
  | "settlement_resolved"
  | "deposit_returned"
  | "completed";

/** Ordered steps shown in the end-of-tenancy tracker. */
export const END_STAGES: { key: EndStageKey; label: string }[] = [
  { key: "notice_served", label: "Notice served" },
  { key: "notice_acknowledged", label: "Notice acknowledged" },
  { key: "inspection", label: "Move-out inspection" },
  { key: "inspection_reviewed", label: "Inspection reviewed" },
  { key: "settlement_proposed", label: "Deposit settlement" },
  { key: "settlement_resolved", label: "Settlement response" },
  { key: "deposit_returned", label: "Deposit returned" },
  { key: "completed", label: "Tenancy closed" },
];

export interface EndStageInput {
  hasActiveNotice: boolean;
  noticeAcknowledged: boolean;
  noticeEndDate: string | null | undefined;
  inspectionSubmitted: boolean;
  inspectionResponse: string | null | undefined;
  settlementProposed: boolean;
  settlementResponse: string | null | undefined;
  depositReturned: boolean;
  completedAt: string | null | undefined;
}

export interface EndStageState {
  key: EndStageKey;
  label: string;
  /** Who has to act next. */
  actor: NoticeParty | "none";
  /** Plain-English next action for whoever is on the clock. */
  nextAction: string;
  /** Steps already done, in tracker order. */
  done: EndStageKey[];
  /** Deposit deadline once an end date exists. */
  depositDeadline: string | null;
  depositDaysLeft: number | null;
  /** True once the notice end date has passed. */
  tenancyEnded: boolean;
  disputed: boolean;
}

export function deriveEndStage(i: EndStageInput): EndStageState {
  const done: EndStageKey[] = [];
  const deadline = depositDeadline(i.noticeEndDate);
  const ended = (daysUntil(i.noticeEndDate) ?? 1) <= 0;
  const disputed = i.inspectionResponse === "disputed" || i.settlementResponse === "disputed";

  const base = {
    done,
    depositDeadline: deadline,
    depositDaysLeft: daysUntil(deadline),
    tenancyEnded: ended,
    disputed,
  };

  if (!i.hasActiveNotice) {
    return {
      ...base,
      key: "active",
      label: "Active tenancy",
      actor: "none",
      nextAction: "Either party can serve a Notice to Quit when they want the tenancy to end.",
    };
  }
  done.push("notice_served");

  if (i.completedAt) {
    done.push(
      "notice_acknowledged",
      "inspection",
      "inspection_reviewed",
      "settlement_proposed",
      "settlement_resolved",
      "deposit_returned",
      "completed",
    );
    return {
      ...base,
      key: "completed",
      label: "Tenancy closed",
      actor: "none",
      nextAction: "This tenancy is closed. All records stay in the Documents tab.",
    };
  }

  if (!i.noticeAcknowledged) {
    return {
      ...base,
      key: "notice_served",
      label: "Notice served",
      actor: "tenant",
      nextAction: "Acknowledge receipt of the Notice to Quit.",
    };
  }
  done.push("notice_acknowledged");

  if (!i.inspectionSubmitted) {
    return {
      ...base,
      key: "inspection",
      label: "Move-out inspection",
      actor: "landlord",
      nextAction: ended
        ? "Complete the move-out condition report and send it to the tenant."
        : "Complete the move-out condition report once the tenancy end date is reached.",
    };
  }
  done.push("inspection");

  if (!i.inspectionResponse) {
    return {
      ...base,
      key: "inspection_reviewed",
      label: "Inspection review",
      actor: "tenant",
      nextAction: "Review the move-out report and agree or dispute it.",
    };
  }
  done.push("inspection_reviewed");

  if (!i.settlementProposed) {
    return {
      ...base,
      key: "settlement_proposed",
      label: "Deposit settlement",
      actor: "landlord",
      nextAction: `Propose the deposit settlement${deadline ? ` by ${formatDate(deadline)}` : ""}.`,
    };
  }
  done.push("settlement_proposed");

  if (!i.settlementResponse) {
    return {
      ...base,
      key: "settlement_resolved",
      label: "Settlement response",
      actor: "tenant",
      nextAction: "Agree or dispute the proposed deposit settlement.",
    };
  }
  done.push("settlement_resolved");

  if (!i.depositReturned) {
    return {
      ...base,
      key: "deposit_returned",
      label: "Deposit return",
      actor: "landlord",
      nextAction:
        i.settlementResponse === "disputed"
          ? "Refer the dispute to the deposit scheme, then record the outcome."
          : `Return the deposit${deadline ? ` by ${formatDate(deadline)}` : ""} and record it.`,
    };
  }
  done.push("deposit_returned");

  return {
    ...base,
    key: "deposit_returned",
    label: "Ready to close",
    actor: "landlord",
    nextAction: "Close the tenancy and decide whether to relist the property.",
  };
}

/** Short badge text for dashboards and property cards. */
export function endStageBadge(stage: EndStageState, endDate?: string | null) {
  if (stage.key === "completed") return "Tenancy completed";
  if (stage.key === "active") return "Let agreed";
  const days = daysUntil(endDate);
  if (days !== null && days > 0) return `Notice served — ends ${formatDate(endDate)}`;
  return stage.disputed ? "Ending — dispute open" : `Ending — ${stage.label.toLowerCase()}`;
}
