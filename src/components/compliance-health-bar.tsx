import { AlertTriangle, Check, Clock, ShieldCheck } from "lucide-react";
import { certificateState, usePropertyCertificates } from "@/components/property-certificates";

type ItemState = "ok" | "warn" | "bad" | "info";

interface Item {
  key: string;
  label: string;
  state: ItemState;
  detail: string;
}

const REQUIRED = [
  { key: "EPC", label: "EPC" },
  { key: "Gas Safety", label: "Gas Safety" },
  { key: "Electrical", label: "EICR" },
  { key: "Alarms", label: "Smoke/Heat/CO alarms" },
] as const;

/**
 * Top-of-workspace compliance indicator: safety certificates on file plus the
 * Tenancy Information Notice 28-day duty (Private Tenancies Act (NI) 2022).
 */
export function ComplianceHealthBar({
  propertyId,
  startDate,
  tinAcknowledgedAt,
  existingTenancy = false,
  tinOnFileReportedAt = null,
}: {
  /** Tenancy began before RoostNI: no deadline alarms, no legal position stated. */
  existingTenancy?: boolean;
  tinOnFileReportedAt?: string | null;
  propertyId: string;
  startDate: string | null;
  tinAcknowledgedAt: string | null;
}) {
  const { data: certs = [], isLoading } = usePropertyCertificates(propertyId);

  const items: Item[] = REQUIRED.map(({ key, label }) => {
    const latest = certs.find((c) => c.kind === key);
    if (!latest) return { key, label, state: "bad", detail: "Not on file" };
    const s = certificateState(latest.expires_on);
    if (s.state === "expired") return { key, label, state: "bad", detail: "Expired" };
    if (s.state === "expiring")
      return { key, label, state: "warn", detail: `Expires in ${s.days} days` };
    return { key, label, state: "ok", detail: "On file" };
  });

  let tin: Item;
  if (existingTenancy) {
    tin = {
      key: "TIN",
      label: "Tenancy Information Notice",
      state: "info",
      detail: tinOnFileReportedAt ? "Landlord says a notice is on file" : "Not recorded",
    };
  } else if (tinAcknowledgedAt) {
    tin = { key: "TIN", label: "Tenancy Information Notice", state: "ok", detail: "Issued & acknowledged" };
  } else if (startDate) {
    const days = Math.ceil(
      (new Date(`${startDate}T00:00:00`).getTime() + 28 * 864e5 - Date.now()) / 864e5,
    );
    tin =
      days < 0
        ? { key: "TIN", label: "Tenancy Information Notice", state: "bad", detail: "28-day deadline passed" }
        : { key: "TIN", label: "Tenancy Information Notice", state: "warn", detail: `${days} days left to issue` };
  } else {
    tin = { key: "TIN", label: "Tenancy Information Notice", state: "warn", detail: "Due within 28 days of start" };
  }
  items.push(tin);

  const scored = items.filter((i) => i.state !== "info");
  const okCount = scored.filter((i) => i.state === "ok").length;
  const pct = Math.round((okCount / scored.length) * 100);
  const allGood = okCount === scored.length;

  return (
    <section
      aria-label="Compliance health"
      className="mb-5 rounded-sm border border-border bg-surface p-4 shadow-raised sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className={`h-5 w-5 ${allGood ? "text-verified" : "text-muted-foreground"}`} />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Compliance health
            </p>
            <p className="font-display text-base font-semibold tracking-tight">
              {isLoading ? "Checking…" : `${okCount} of ${scored.length} certificates on file`}
            </p>
          </div>
        </div>
        <span className="font-display text-2xl font-semibold tabular-nums">{isLoading ? "—" : `${pct}%`}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-verified transition-all" style={{ width: `${isLoading ? 0 : pct}%` }} />
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {items.map((i) => (
          <li
            key={i.key}
            className={`flex items-start gap-2 rounded-sm border px-3 py-2 ${
              i.state === "ok"
                ? "border-verified/30 bg-verified-soft"
                : i.state === "info"
                  ? "border-border bg-surface-muted"
                  : i.state === "warn"
                  ? "border-amber-300/60 bg-amber-50 dark:bg-amber-950/30"
                  : "border-rose-300/60 bg-rose-50 dark:bg-rose-950/30"
            }`}
          >
            {i.state === "info" ? (
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            ) : i.state === "ok" ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-verified" strokeWidth={3} />
            ) : i.state === "warn" ? (
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700 dark:text-rose-300" />
            )}
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-foreground">{i.label}</span>
              <span className="block text-[11px] text-muted-foreground">{i.detail}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Upload certificates in the Documents tab. General information only, not legal advice — see
        nidirect.gov.uk.
      </p>
    </section>
  );
}
