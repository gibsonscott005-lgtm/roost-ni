import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Info, ReceiptText } from "lucide-react";
import { getBillingSnapshot, type BillingSnapshot } from "@/lib/pricing.functions";
import {
  DEFAULT_BILLING_CONFIG,
  STANDARD_PLAN,
  formatGBP,
  monthlyPence,
  paymentsActive,
  planSummary,
} from "@/lib/pricing";
import { BILLING_NOTE, SHORT_LINES } from "@/lib/plans-copy";

const FALLBACK: BillingSnapshot = { config: DEFAULT_BILLING_CONFIG, propertyCount: 0 };

/** Reads billing config and the landlord's home count. Never charges anything. */
export function useBillingSnapshot(enabled = true) {
  const fetchSnapshot = useServerFn(getBillingSnapshot);
  const query = useQuery({
    enabled,
    queryKey: ["billing-snapshot"],
    staleTime: 60_000,
    queryFn: () => fetchSnapshot(),
  });
  const snapshot = query.data ?? FALLBACK;
  return { ...query, snapshot, active: paymentsActive(snapshot.config) };
}

export function SimulatedBillingNotice({ className = "" }: { className?: string }) {
  return (
    <p
      className={`flex items-start gap-2 rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-900 ${className}`}
    >
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        <strong className="font-semibold">{BILLING_NOTE}</strong> Every tool keeps working and
        nothing is restricted.
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

/** Preview of the monthly price for the landlord's homes. Informational while billing is off. */
export function PricingBreakdown({
  title = "Pricing preview",
  className = "",
}: {
  title?: string;
  itemKeys?: string[];
  showCompletionFee?: boolean;
  className?: string;
}) {
  const { snapshot, active, isPending } = useBillingSnapshot();
  const homes = snapshot.propertyCount;

  return (
    <section className={`rounded-3xl border border-border bg-surface p-5 ${className}`}>
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-surface-muted">
          <ReceiptText className="h-4 w-4 text-foreground" />
        </span>
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight">{title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isPending ? "Counting your homes…" : `${homes} ${homes === 1 ? "home" : "homes"} on your account`}
          </p>
        </div>
      </div>

      <div className="mt-3 divide-y divide-border/70">
        <Row
          label="Standard monthly price"
          note={`${planSummary(STANDARD_PLAN)}. Every tool is included.`}
          value={formatGBP(monthlyPence(homes, STANDARD_PLAN))}
        />
        <Row label="Tenants" note={SHORT_LINES.noCommission} value={SHORT_LINES.tenantsNeverPay} />
      </div>

      {active ? null : <SimulatedBillingNotice className="mt-3" />}
    </section>
  );
}
