// Single source of truth for RoostNI pricing/plan wording.
// Never hard-code "free"/price copy in components — import from here.

export const APPROVED_LINE =
  "Core tools are free forever. Optional paid services are always opt-in and clearly priced.";

export const SHORT_LINES = {
  coreFree: "Core tools free forever",
  coreFreeSentence: "Core tools are free forever, with no commission on rent.",
  noCommission: "No commission on rent",
  tenantsNeverPay: "Never any fees for tenants",
  freeToList: "Free to list",
  ticker: "NO COMMISSION ON RENT   //   CORE TOOLS FREE FOREVER   //   BUILT FOR NORTHERN IRELAND LAW   //   ",
} as const;

export const PERMANENTLY_FREE = [
  "Property listings",
  "Tenant Passports",
  "The applicant inbox",
  "Tenancy management",
  "Rent ledger and rent receipts",
  "Maintenance tickets",
  "Every statutory tool: the compliance check, the Notice to Quit calculator, the Tenancy Information Notice help and cash rent receipts",
] as const;

export type PlanStatus = "live" | "planned";
export interface Plan {
  id: string;
  name: string;
  status: PlanStatus;
  /** Monthly price in GBP; null until launched. */
  price: number | null;
  paidBy: "nobody" | "landlord" | "third-party";
}

export const PLANS: readonly Plan[] = [
  { id: "core", name: "Core", status: "live", price: 0, paidBy: "nobody" },
  { id: "pro", name: "Pro (5+ properties)", status: "planned", price: null, paidBy: "landlord" },
  { id: "listing-boost", name: "Listing boost", status: "planned", price: null, paidBy: "landlord" },
  { id: "verified-badge", name: "Verified badge", status: "planned", price: null, paidBy: "landlord" },
  { id: "rent-collection", name: "Rent collection", status: "planned", price: null, paidBy: "landlord" },
  { id: "trade-referrals", name: "Trade referrals", status: "planned", price: null, paidBy: "third-party" },
  { id: "insurance-referrals", name: "Insurance referrals", status: "planned", price: null, paidBy: "third-party" },
];

/** Planned services may only ever be described as possible future options. */
export function planLabel(plan: Plan): string {
  return plan.status === "live" ? plan.name : `${plan.name} — possible future option`;
}

export const BANNED_PHRASES = [
  "100% free",
  "zero fees",
  "no fees",
  "no catch",
  "free during beta",
  "free during the open beta",
] as const;

export function findBannedPhrases(text: string): string[] {
  const lower = text.toLowerCase();
  return BANNED_PHRASES.filter((p) => lower.includes(p));
}

export const FUNDING_PAGE_PATH = "/how-roostni-is-funded" as const;
