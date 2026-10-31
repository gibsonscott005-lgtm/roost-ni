/**
 * RoostNI pricing model — client-safe. No secrets, no provider SDKs.
 *
 * Landlords pay by the number of homes they manage. Every tool is included at
 * every level. Tenants never pay. Billing is not switched on yet.
 * Prices are held in pence.
 */

export type PlanKey = "standard" | "founding";

export interface PricingPlan {
  key: PlanKey;
  name: string;
  firstHomePence: number;
  extraHomePence: number;
  capPence: number;
  /** Months at no charge from the day the first home is added. */
  introMonths: number;
  /** Months the price is locked for. 0 = no lock promised. */
  lockMonths: number;
}

export const STANDARD_PLAN: PricingPlan = {
  key: "standard",
  name: "Standard",
  firstHomePence: 700,
  extraHomePence: 400,
  capPence: 5900,
  introMonths: 0,
  lockMonths: 0,
};

export const FOUNDING_PLAN: PricingPlan = {
  key: "founding",
  name: "Founding landlord",
  firstHomePence: 500,
  extraHomePence: 300,
  capPence: 4900,
  introMonths: 1,
  lockMonths: 24,
};

/** The first this many landlords who add a home (tenanted or vacant) get the founding price. */
export const FOUNDING_LANDLORD_LIMIT = 20;
/** An archived home stops counting after this many months. */
export const ARCHIVE_UNCOUNT_MONTHS = 12;

export const PRICING_PLANS: readonly PricingPlan[] = [STANDARD_PLAN, FOUNDING_PLAN];

export interface BillingConfig {
  payments_enabled: boolean;
  currency: string;
  notice: string | null;
}

export const DEFAULT_BILLING_CONFIG: BillingConfig = {
  payments_enabled: false,
  currency: "GBP",
  notice: "Billing is not switched on yet. Nothing is charged today.",
};

/** Client-side feature flag. Off unless the environment explicitly turns it on. */
export function paymentGatewayFlag(): boolean {
  const raw = import.meta.env["VITE_ENABLE_PAYMENT_GATEWAY"];
  return String(raw ?? "false").toLowerCase() === "true";
}

/** Charging only happens when the client flag AND the server-side config agree. */
export function paymentsActive(config: BillingConfig | null | undefined): boolean {
  return paymentGatewayFlag() && !!config?.payments_enabled;
}

export function formatGBP(pence: number): string {
  return `£${(pence / 100).toFixed(2).replace(/\.00$/, "")}`;
}

/** Monthly price for a number of homes: first home, plus each extra, capped. */
export function monthlyPence(homes: number, plan: PricingPlan = STANDARD_PLAN): number {
  const n = Math.max(0, Math.floor(homes));
  if (n === 0) return 0;
  return Math.min(plan.capPence, plan.firstHomePence + (n - 1) * plan.extraHomePence);
}

export function planSummary(plan: PricingPlan): string {
  return `${formatGBP(plan.firstHomePence)} a month for your first home, plus ${formatGBP(plan.extraHomePence)} for each extra home, never more than ${formatGBP(plan.capPence)}`;
}

/** Tenants never pay anything. */
export const TENANT_FEE_PENCE = 0;
