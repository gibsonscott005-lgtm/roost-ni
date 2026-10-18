import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Info, ReceiptText } from "lucide-react";
import { getBillingSnapshot, type BillingSnapshot } from "@/lib/pricing.functions";
import {
  DEFAULT_BILLING_CONFIG,
  PRICING_ITEMS,
  PRICING_TIERS,
  completionFeePence,
  findItem,
  formatGBP,
  monthlyLabel,
  paymentsActive,
  tierForPropertyCount,
  tierRangeLabel,
  type PricingTier,
} from "@/lib/pricing";

const FALLBACK: BillingSnapshot = {
  config: DEFAULT_BILLING_CONFIG,
  tiers: PRICING_TIERS,
  items: PRICING_ITEMS,
  propertyCount: 0,
};

/** Reads the pricing catalogue and the landlord's tier. Never charges anything. */
export function useBillingSnapshot(enabled = true) {
  const fetchSnapshot = useServerFn(getBillingSnapshot);
  const query = useQuery({
    enabled,
    queryKey: ["billing-snapshot"],
    staleTime: 60_000,
    queryFn: () => fetchSnapshot(),
  });
  const snapshot = query.data ?? FALLBACK;
  const tier = tierForPropertyCount(snapshot.propertyCount, snapshot.tiers);
  return {
    ...query,
    snapshot,
    tier,
    active: paymentsActive(snapshot.config),
  };
}

export function SimulatedBillingNotice({ className = "" }: { className?: string }) {
  return (
    <p
      className={`flex items-start gap-2 rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-900 ${className}`}
    >
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        <strong className="font-semibold">Coming soon — nothing charged today.</strong> Billing is not
        active on RoostNI yet. Prices are shown for preview only and nothing is charged or
        restricted.
      </span>
    </p>
  );
}

function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-sm">
        {label}
        {note ? <span className="mt-0.5 block text-xs text-muted-foreground">{note}</span> : null}
      </span>
      <span className="shrink-0 text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}

/**
 * Preview panel of what a tenancy or document would cost on the landlord's
 * current tier. Purely informational while billing is off.
 */
export function PricingBreakdown({
  title = "Pricing preview",
  itemKeys = [],
  showCompletionFee = true,
  className = "",
}: {
  title?: string;
  itemKeys?: string[];
  showCompletionFee?: boolean;
  className?: string;
}) {
  const { snapshot, tier, active, isPending } = useBillingSnapshot();
  const items = itemKeys
    .map((k) => findItem(k, snapshot.items))
    .filter((i): i is NonNullable<typeof i> => !!i);

  return (
    <section className={`rounded-3xl border border-border bg-surface p-5 ${className}`}>
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-surface-muted">
          <ReceiptText className="h-4 w-4 text-foreground" />
        </span>
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight">{title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isPending
              ? "Working out your tier…"
              : `Your plan: ${tier.name} — ${monthlyLabel(tier, snapshot.propertyCount)}`}
          </p>
        </div>
      </div>

      <div className="mt-3 divide-y divide-border/70">
        {showCompletionFee ? (
          <Row
            label="Tenancy completion fee"
            note={`Charged once when a tenancy completes on the ${tier.name} plan.`}
            value={formatGBP(completionFeePence(tier))}
          />
        ) : null}
        {items.map((i) => (
          <Row key={i.key} label={i.name} note={i.description ?? undefined} value={formatGBP(i.price_pence)} />
        ))}
      </div>

      {active ? null : <SimulatedBillingNotice className="mt-3" />}
    </section>
  );
}

export function TierTable({
  tiers,
  currentKey,
  propertyCount,
}: {
  tiers: PricingTier[];
  currentKey: string;
  propertyCount: number;
}) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Plan</th>
            <th className="py-2 pr-3 font-medium">Properties</th>
            <th className="py-2 pr-3 font-medium">Monthly</th>
            <th className="py-2 font-medium">Completion fee</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/70">
          {tiers.map((t) => {
            const mine = t.key === currentKey;
            return (
              <tr key={t.key} className={mine ? "bg-verified/5" : ""}>
                <td className="py-2.5 pr-3 font-semibold">
                  {t.name}
                  {mine ? (
                    <span className="ml-2 rounded-full bg-verified/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-verified">
                      Your plan
                    </span>
                  ) : null}
                </td>
                <td className="py-2.5 pr-3 text-muted-foreground">{tierRangeLabel(t)}</td>
                <td className="py-2.5 pr-3 tabular-nums">
                  {mine ? monthlyLabel(t, propertyCount) : monthlyLabel(t)}
                </td>
                <td className="py-2.5 tabular-nums">{formatGBP(t.completion_fee_pence)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
