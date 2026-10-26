// Single source of truth for RoostNI pricing/plan wording.
// Never hard-code price or plan copy in components — import from here.

export const APPROVED_LINE =
  "Every tool is included at every level. Pay by the number of homes you manage. No commission on rent. Never any fees for tenants.";

export const BILLING_NOTE = "Billing is not switched on yet. Nothing is charged today.";
export const STATUTORY_NOTE = "Statutory tools stay open to everyone.";

export const SHORT_LINES = {
  everyToolIncluded: "Every tool included",
  payByHomes: "Pay by the number of homes you manage",
  noCommission: "No commission on rent",
  tenantsNeverPay: "Never any fees for tenants",
  billingOff: "Billing not switched on yet",
  noCommissionSentence: "No commission on rent, and never any fees for tenants.",
  ticker: "NO COMMISSION ON RENT   //   NEVER ANY FEES FOR TENANTS   //   BUILT FOR NORTHERN IRELAND LAW   //   ",
} as const;

export type PlanStatus = "live" | "not_billing" | "planned";
export interface Plan {
  id: string;
  name: string;
  status: PlanStatus;
  paidBy: "nobody" | "landlord" | "third-party";
}

/** Pricing figures live in pricing.ts; billing is not switched on for any plan. */
export const PLANS: readonly Plan[] = [
  { id: "standard", name: "Standard", status: "not_billing", paidBy: "landlord" },
  { id: "founding", name: "Founding landlord", status: "not_billing", paidBy: "landlord" },
];

export function planLabel(plan: Plan): string {
  return plan.status === "live" ? plan.name : `${plan.name} — billing not switched on yet`;
}

export const BANNED_PHRASES = [
  "100% free",
  "zero fees",
  "no fees",
  "no catch",
  "free during beta",
  "free during the open beta",
  "free forever",
  "core tools are free",
  "free to list",
] as const;

export function findBannedPhrases(text: string): string[] {
  const lower = text.toLowerCase();
  return BANNED_PHRASES.filter((p) => lower.includes(p));
}

export const FUNDING_PAGE_PATH = "/how-roostni-is-funded" as const;
