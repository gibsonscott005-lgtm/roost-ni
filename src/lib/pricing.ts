/**
 * Roost pricing model — client-safe. No secrets, no provider SDKs.
 *
 * The tables below mirror `public.pricing_tiers` / `public.pricing_items` and act
 * as the typed fallback when the database has not been read yet. Prices are held
 * in pence so nothing is ever lost to floating point.
 */

export interface PricingTier {
  key: string;
  name: string;
  min_properties: number;
  max_properties: number | null;
  monthly_pence: number;
  per_extra_unit_pence: number;
  completion_fee_pence: number;
  sort_order: number;
}

export interface PricingItem {
  key: string;
  name: string;
  category: string;
  description: string | null;
  price_pence: number;
  is_active: boolean;
  sort_order: number;
}

export interface BillingConfig {
  payments_enabled: boolean;
  currency: string;
  notice: string | null;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    key: "starter",
    name: "Starter",
    min_properties: 0,
    max_properties: 1,
    monthly_pence: 0,
    per_extra_unit_pence: 0,
    completion_fee_pence: 3900,
    sort_order: 1,
  },
  {
    key: "pro",
    name: "Pro Portfolio",
    min_properties: 2,
    max_properties: 5,
    monthly_pence: 999,
    per_extra_unit_pence: 0,
    completion_fee_pence: 1900,
    sort_order: 2,
  },
  {
    key: "growth",
    name: "Growth Portfolio",
    min_properties: 6,
    max_properties: 10,
    monthly_pence: 1499,
    per_extra_unit_pence: 0,
    completion_fee_pence: 900,
    sort_order: 3,
  },
  {
    key: "enterprise",
    name: "Enterprise Portfolio",
    min_properties: 11,
    max_properties: null,
    monthly_pence: 1999,
    per_extra_unit_pence: 150,
    completion_fee_pence: 1500,
    sort_order: 4,
  },
];

export const PRICING_ITEM_KEYS = {
  tenancyAgreement: "doc_tenancy_agreement_tin",
  noticeToQuit: "doc_notice_to_quit",
  rentIncrease: "doc_rent_increase_notice",
  checkOut: "doc_checkout_inspection",
  biometric: "biometric_identity_pass",
} as const;

export const PRICING_ITEMS: PricingItem[] = [
  {
    key: PRICING_ITEM_KEYS.tenancyAgreement,
    name: "NI Statutory Tenancy Agreement & TIN",
    category: "document",
    description:
      "Northern Ireland tenancy agreement with the statutory Tenancy Information Notice.",
    price_pence: 1499,
    is_active: true,
    sort_order: 1,
  },
  {
    key: PRICING_ITEM_KEYS.noticeToQuit,
    name: "Statutory Notice to Quit Generator",
    category: "document",
    description: "Notice to Quit with the correct statutory notice period applied.",
    price_pence: 1299,
    is_active: true,
    sort_order: 2,
  },
  {
    key: PRICING_ITEM_KEYS.rentIncrease,
    name: "Statutory Rent Increase Notice",
    category: "document",
    description: "Rent increase notice in the statutory form.",
    price_pence: 999,
    is_active: true,
    sort_order: 3,
  },
  {
    key: PRICING_ITEM_KEYS.checkOut,
    name: "Check-Out Inspection & Fair Fuel Baseline Log",
    category: "document",
    description: "Move-out inspection record with the Fair Fuel handover comparison.",
    price_pence: 999,
    is_active: true,
    sort_order: 4,
  },
  {
    key: PRICING_ITEM_KEYS.biometric,
    name: "Biometric Identity Pass",
    category: "identity",
    description:
      "Optional document authenticity and face-match check. The free self-certified route always remains available.",
    price_pence: 500,
    is_active: true,
    sort_order: 5,
  },
];

export const DEFAULT_BILLING_CONFIG: BillingConfig = {
  payments_enabled: false,
  currency: "GBP",
  notice: "Simulated billing — no payments are taken and no feature is restricted.",
};

/** Client-side feature flag. Off unless the environment explicitly turns it on. */
export function paymentGatewayFlag(): boolean {
  const raw = import.meta.env["VITE_ENABLE_PAYMENT_GATEWAY"];
  return String(raw ?? "false").toLowerCase() === "true";
}

/**
 * Charging only happens when the client flag AND the server-side config agree.
 * Either one being off keeps Roost in simulated mode.
 */
export function paymentsActive(config: BillingConfig | null | undefined): boolean {
  return paymentGatewayFlag() && !!config?.payments_enabled;
}

export function formatGBP(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

export function tierForPropertyCount(
  count: number,
  tiers: PricingTier[] = PRICING_TIERS,
): PricingTier {
  const sorted = [...tiers].sort((a, b) => a.sort_order - b.sort_order);
  const n = Math.max(0, Math.floor(count));
  const match = sorted.find(
    (t) => n >= t.min_properties && (t.max_properties === null || n <= t.max_properties),
  );
  return match ?? sorted[sorted.length - 1] ?? PRICING_TIERS[0]!;
}

/** Monthly charge in pence, including the per-unit uplift above a tier's ceiling. */
export function monthlyPence(tier: PricingTier, count: number): number {
  const n = Math.max(0, Math.floor(count));
  if (tier.per_extra_unit_pence <= 0) return tier.monthly_pence;
  const base = Math.max(tier.min_properties - 1, 0); // Enterprise starts counting above 10
  const extra = Math.max(n - base, 0);
  return tier.monthly_pence + extra * tier.per_extra_unit_pence;
}

export function completionFeePence(tier: PricingTier): number {
  return tier.completion_fee_pence;
}

export function tierRangeLabel(tier: PricingTier): string {
  if (tier.max_properties === null) return `${tier.min_properties - 1}+ properties`;
  if (tier.max_properties === 1) return "1 property";
  return `Up to ${tier.max_properties} properties`;
}

export function monthlyLabel(tier: PricingTier, count?: number): string {
  if (tier.per_extra_unit_pence > 0) {
    const base = `${formatGBP(tier.monthly_pence)}/mo + ${formatGBP(tier.per_extra_unit_pence)} per unit over ${tier.min_properties - 1}`;
    if (count === undefined) return base;
    return `${formatGBP(monthlyPence(tier, count))}/mo (${base})`;
  }
  return `${formatGBP(tier.monthly_pence)}/mo`;
}

export function findItem(
  key: string,
  items: PricingItem[] = PRICING_ITEMS,
): PricingItem | undefined {
  return items.find((i) => i.key === key) ?? PRICING_ITEMS.find((i) => i.key === key);
}

/** One-off tenant fee for a verified passport, in pence. Single source of truth. */
export const BIOMETRIC_FEE_PENCE =
  PRICING_ITEMS.find((i) => i.key === PRICING_ITEM_KEYS.biometric)?.price_pence ?? 500;
