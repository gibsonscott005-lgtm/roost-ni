import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, Briefcase, Check, Clock, ExternalLink, Inbox, Loader2, RefreshCw, ShieldCheck, TrendingUp, X, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { emitNotification, type EmitNotificationInput } from "@/lib/notifications.functions";
import { signIdDocumentUrl, signIncomeDocumentUrl } from "@/lib/identity-docs.functions";
import { Skeleton } from "@/components/ui/skeleton";

function notify(payload: EmitNotificationInput) {
  emitNotification({ data: payload }).catch((err) =>
    console.error("[notify]", err),
  );
}

export const Route = createFileRoute("/_authenticated/dashboard/applications")({
  validateSearch: z.object({ listing: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Received Passports — Roost NI" },
      {
        name: "description",
        content:
          "Review self-certified Tenant Passports submitted to your NI listings. Roost organises the information — the letting decision stays yours.",
      },
    ],
  }),
  component: ApplicationsPage,
});

type Status = "pending" | "reviewed" | "accepted";

interface Share {
  id: string;
  status: Status;
  shared_at: string;
  tenant_id: string;
  listing_id: string;
  lease_status: string | null;
  lease_signed_at: string | null;
  lease_signed_name: string | null;
  tenant: { id: string; full_name: string } | null;
  listing: { id: string; title: string; monthly_rent: number | null } | null;
}

interface Passport {
  user_id: string;
  identity_verified: boolean;
  income_verified: boolean;
  reference_verified: boolean;
  right_to_rent_verified: boolean;
  monthly_income_net: number | null;
  annual_income: number | null;
  employment_status: string | null;
  income_document_path: string | null;
  income_breakdown: {
    employment_gross_annual?: number;
    universal_credit_annual?: number;
    housing_element_annual?: number;
    disability_benefits_annual?: number;
    other_benefits_annual?: number;
  } | null;
  willing_direct_payment_apa: boolean | null;
  preferred_heating: string | null;
  accept_empty_in_full_out: boolean;
  id_status: string | null;
  id_verified_at: string | null;
  issuing_country: string | null;
  id_document_path: string | null;
}

function ApplicationsPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState<Share | null>(null);
  const queryClient = useQueryClient();
  const { listing: listingFilter } = Route.useSearch();

  const isLandlord = profile?.account_type === "landlord";

  const inboxQuery = useQuery({
    enabled: !!user && isLandlord,
    queryKey: ["landlord-applications", user?.id ?? null],
    queryFn: async () => {
      const { data: rows, error: rowsErr } = await supabase
        .from("passport_shares")
        .select(
          "id, status, shared_at, tenant_id, listing_id, lease_status, lease_signed_at, lease_signed_name, tenant:profiles!tenant_id(id, full_name), listing:property_listings!listing_id(id, title, monthly_rent)",
        )
        .order("shared_at", { ascending: false });
      if (rowsErr) throw rowsErr;
      const list = (rows as unknown as Share[] | null) ?? [];

      const { count } = await supabase
        .from("property_listings")
        .select("id", { count: "exact", head: true })
        .eq("landlord_id", user!.id);

      const tenantIds = Array.from(new Set(list.map((s) => s.tenant_id)));
      const passports: Record<string, Passport> = {};
      if (tenantIds.length) {
        const { data: p } = await supabase
          .from("tenant_passports")
          .select(
            "user_id, identity_verified, income_verified, reference_verified, right_to_rent_verified, monthly_income_net, annual_income, employment_status, income_document_path, income_breakdown, willing_direct_payment_apa, preferred_heating, accept_empty_in_full_out, id_status, id_verified_at, issuing_country, id_document_path",
          )
          .in("user_id", tenantIds);
        ((p as Passport[] | null) ?? []).forEach((row) => {
          passports[row.user_id] = row;
        });
      }
      return { shares: list, passports, listingCount: count ?? 0 };
    },
  });

  const allShares = inboxQuery.data?.shares ?? [];
  const shares = listingFilter
    ? allShares.filter((s) => s.listing_id === listingFilter)
    : allShares;
  const passports = inboxQuery.data?.passports ?? {};
  const listingCount = inboxQuery.data?.listingCount ?? 0;
  const loading = inboxQuery.isPending && isLandlord;

  const acceptMutation = useMutation({
    mutationFn: async (share: Share) => {
      const { error } = await supabase
        .from("passport_shares")
        .update({ status: "accepted", landlord_checks_confirmed_at: new Date().toISOString() })
        .eq("id", share.id);
      if (error) throw error;
      // Mark the property as Under Offer so it shows on public listings
      // and disables further applications.
      const { error: listingErr } = await supabase
        .from("property_listings")
        .update({ status: "under_offer" })
        .eq("id", share.listing_id);
      if (listingErr) throw listingErr;
      return share;
    },
    onSuccess: (share) => {
      toast.success("Applicant accepted", {
        description: `${share.tenant?.full_name ?? "Tenant"} accepted. Listing marked as Under Offer.`,
      });
      setOpen((o) => (o ? { ...o, status: "accepted" } : null));
      queryClient.invalidateQueries({ queryKey: ["landlord-applications"] });
      queryClient.invalidateQueries({ queryKey: ["passport-share"] });
      notify({
        recipient_id: share.tenant_id,
        type: "application_accepted",
        entity_type: "passport_share",
        entity_id: share.id,
        title: "Application accepted",
        body: `Your application for ${share.listing?.title ?? "the property"} has been accepted. Prepare for lease documents.`,
        link_path: "/dashboard",
      });
    },
    onError: (err: unknown) => {
      toast.error("Could not update", {
        description: err instanceof Error ? err.message : "Please try again",
      });
    },
  });
  const accept = (share: Share) => acceptMutation.mutate(share);

  const countersignMutation = useMutation({
    mutationFn: async (share: Share) => {
      const { error } = await supabase
        .from("passport_shares")
        .update({ lease_status: "counter_signed" })
        .eq("id", share.id);
      if (error) throw error;
      return share;
    },
    onSuccess: (share) => {
      toast.success("Lease counter-signed", {
        description: `${share.tenant?.full_name ?? "Tenant"} has been notified. Lease is fully executed.`,
      });
      queryClient.invalidateQueries({ queryKey: ["landlord-applications"] });
      queryClient.invalidateQueries({ queryKey: ["passport-share"] });
      notify({
        recipient_id: share.tenant_id,
        type: "lease_counter_signed",
        entity_type: "passport_share",
        entity_id: share.id,
        title: "Lease fully executed",
        body: `Your lease for ${share.listing?.title ?? "the property"} is signed by both parties. Welcome to your tenancy workspace.`,
        link_path: "/tenant/tenancy",
      });
    },
    onError: (err: unknown) => {
      toast.error("Could not counter-sign", {
        description: err instanceof Error ? err.message : "Please try again",
      });
    },
  });
  const countersign = (share: Share) => countersignMutation.mutate(share);

  return (
    <DashboardShell
      user={user}
      profile={profile}
      activeKey="applications"
      listingsCount={listingCount}
      applicationsCount={shares.length}
    >
      {!isLandlord ? (
        <div className="rounded-3xl border border-border bg-surface p-6 text-sm text-muted-foreground sm:p-8">
          Received passports are visible to landlord accounts only.
        </div>
      ) : (
        <div>
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Inbox
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold tracking-tight sm:text-2xl">
              Received passports
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Self-certified applicants who applied to your live listings.
            </p>
            <HowRoostWorksPanel />
            {listingFilter ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-full border border-border bg-surface-muted/60 px-3 py-1.5 text-xs text-muted-foreground w-fit">
                <span>
                  Filtered to:{" "}
                  <span className="font-medium text-foreground">
                    {allShares.find((s) => s.listing_id === listingFilter)?.listing?.title ?? "Selected listing"}
                  </span>
                </span>
                <Link
                  to="/dashboard/applications"
                  className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-foreground hover:bg-secondary"
                >
                  Clear
                </Link>
              </div>
            ) : null}
          </div>

          {loading ? (
            <ul
              className="overflow-hidden rounded-2xl border border-border bg-surface"
              aria-busy="true"
              aria-label="Loading applicants"
            >
              {Array.from({ length: 3 }).map((_, i) => (
                <li
                  key={i}
                  className={`flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between ${i > 0 ? "border-t border-border" : ""}`}
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                    <div className="flex gap-1.5 pt-1">
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-24 rounded-full" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-28 rounded-full" />
                </li>
              ))}
            </ul>
          ) : shares.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-surface p-10 text-center">
              <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-display text-base font-semibold tracking-tight">
                No applications yet — inbox is clear
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                When a tenant shares their Roost passport with one of your listings, they'll land here with a full self-certified summary.
              </p>
              <Link
                to="/dashboard"
                className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
              >
                Back to properties
              </Link>
            </div>
          ) : (
            <ul className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_48px_-32px_rgba(15,23,42,0.18)]">
              {shares.map((s, i) => {
                const p = passports[s.tenant_id];
                const declaredCount = p
                  ? [p.identity_verified, p.income_verified, p.reference_verified, p.right_to_rent_verified].filter(Boolean).length
                  : 0;
                return (
                  <li
                    key={s.id}
                    className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 ${
                      i > 0 ? "border-t border-border" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-display text-base font-semibold tracking-tight">
                        {s.tenant?.full_name || "Applicant"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        Applied to <span className="text-foreground/90">{s.listing?.title ?? "your listing"}</span> · {timeAgo(s.shared_at)}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {p?.id_status === "self_certified" ? (
                          <SelfCertifiedIdBadge country={p.issuing_country} verifiedAt={p.id_verified_at} />
                        ) : (
                          <VerifyBadge label="ID" ok={!!p?.identity_verified} />
                        )}
                        <VerifyBadge label="Income" ok={!!p?.income_verified} />
                        <VerifyBadge label="References" ok={!!p?.reference_verified} />
                        <VerifyBadge label="Right to rent" ok={!!p?.right_to_rent_verified} />
                        <span className="ml-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {declaredCount}/4 declared
                        </span>
                        <AffordabilityBadge
                          passport={p ?? null}
                          monthlyRent={s.listing?.monthly_rent ?? null}
                        />
                        {p?.willing_direct_payment_apa ? <ApaPill /> : null}
                      </div>
                      <IncomeSummaryRow
                        shareId={s.id}
                        employmentStatus={p?.employment_status ?? null}
                        hasIncomeDoc={!!p?.income_document_path}
                      />
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusPill status={s.status} />
                      {s.lease_status === "counter_signed" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-verified px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-verified-foreground)]">
                          <ShieldCheck className="h-3 w-3" />
                          Lease fully executed
                        </span>
                      ) : s.lease_status === "signed_pending_landlord" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-verified-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-verified">
                          <ShieldCheck className="h-3 w-3" />
                          Tenant signed
                        </span>
                      ) : s.lease_status === "sent_to_tenant" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Awaiting tenant
                        </span>
                      ) : null}
                      {s.status === "accepted" &&
                      s.lease_status !== "signed_pending_landlord" &&
                      s.lease_status !== "counter_signed" ? (
                        <button
                          type="button"
                          onClick={() =>
                            navigate({ to: "/landlord/issue-lease", search: { share: s.id } })
                          }
                          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-2 text-xs font-semibold text-background transition hover:brightness-110"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {s.lease_status === "sent_to_tenant" ? "View lease" : "Issue lease"}
                        </button>
                      ) : null}
                      {s.lease_status === "signed_pending_landlord" ? (
                        <button
                          type="button"
                          onClick={() => countersign(s)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-verified px-3.5 py-2 text-xs font-semibold text-[var(--color-verified-foreground)] transition hover:brightness-95"
                        >
                          <Check className="h-3.5 w-3.5" strokeWidth={3} />
                          Counter-sign
                        </button>
                      ) : null}
                      {s.lease_status === "counter_signed" ? (
                        <button
                          type="button"
                          onClick={() =>
                            navigate({ to: "/landlord/manage-tenancy", search: { share: s.id } })
                          }
                          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-2 text-xs font-semibold text-background transition hover:brightness-110"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Manage tenancy
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setOpen(s)}
                        className="rounded-full border border-border bg-surface-muted px-3.5 py-2 text-xs font-medium text-foreground transition hover:bg-secondary"
                      >
                        View full passport
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {open ? (
        <PassportModal
          share={open}
          passport={passports[open.tenant_id] ?? null}
          onAccept={() => accept(open)}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </DashboardShell>
  );
}

function VerifyBadge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      title={ok ? `${label}: declared by the applicant with evidence attached. Not independently checked by Roost.` : `${label}: not yet declared by the applicant.`}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
        ok ? "bg-verified-soft text-verified" : "bg-surface-muted text-muted-foreground"
      }`}
    >
      {ok ? <Check className="h-3 w-3" strokeWidth={3} /> : <Clock className="h-3 w-3" />}
      {label}
    </span>
  );
}

/** States plainly what Roost does and does not do, where the decision is made. */
function HowRoostWorksPanel() {
  return (
    <div className="mt-4 rounded-2xl border border-border bg-surface-muted/50 p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <Info className="h-3.5 w-3.5" />
        How Roost works
      </p>
      <p className="mt-2 text-sm text-foreground">
        Roost collects and organises what an applicant tells you, and keeps a timestamped record
        of it. <strong>Roost does not vet, reference or recommend tenants</strong>, and it does not
        rank or score them. Whether to let is your decision, and your own checks still apply.
      </p>
    </div>
  );
}

/** Sits beside the claims so the boundary is impossible to miss. */
function ChecksSplit() {
  const checked = [
    "A document was uploaded and is attached to this application",
    "The income figures the applicant entered add up",
    "The declaration is timestamped and cannot be edited after the fact",
  ];
  const yours = [
    "Identity — compare the document against the person",
    "Right to rent — confirm the applicant's status yourself",
    "Employment — contact the employer directly",
    "Previous landlord — take up the reference yourself",
    "Credit history — Roost does not run credit checks",
  ];
  return (
    <div className="grid gap-3 rounded-2xl border border-border bg-surface p-3.5 sm:grid-cols-2">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-verified">
          What Roost checked
        </p>
        <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
          {checked.map((t) => (
            <li key={t} className="flex gap-1.5">
              <Check className="mt-0.5 h-3 w-3 shrink-0 text-verified" strokeWidth={3} />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
          What you must check yourself
        </p>
        <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
          {yours.map((t) => (
            <li key={t} className="flex gap-1.5">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SelfCertifiedIdBadge({
  country,
  verifiedAt,
}: {
  country: string | null;
  verifiedAt: string | null;
}) {
  const when = verifiedAt ? new Date(verifiedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }) : null;
  return (
    <span
      title={when ? `Self-certified on ${when}` : undefined}
      className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700"
    >
      <BadgeCheck className="h-3 w-3" strokeWidth={2.5} />
      Self-Certified ID{country ? ` (${country})` : ""}
    </span>
  );
}

function formatEmployment(status: string | null): string {
  if (!status) return "Not provided";
  const map: Record<string, string> = {
    permanent_full_time: "Permanent · Full-time",
    permanent_part_time: "Permanent · Part-time",
    self_employed: "Self-employed",
    contract: "Contract",
    student: "Student",
    retired: "Retired",
  };
  return map[status] ?? status;
}

function computeAffordability(
  passport: Passport | null | undefined,
  monthlyRent: number | null | undefined,
): {
  employment: number;
  benefits: number;
  effectiveCapacity: number;
  ratio: number;
  annualRent: number;
} | null {
  if (!passport || !monthlyRent || monthlyRent <= 0) return null;
  const bd = passport.income_breakdown ?? null;
  const employment = Number(bd?.employment_gross_annual ?? 0) || 0;
  const benefits =
    (Number(bd?.universal_credit_annual ?? 0) || 0) +
    (Number(bd?.housing_element_annual ?? 0) || 0) +
    (Number(bd?.disability_benefits_annual ?? 0) || 0) +
    (Number(bd?.other_benefits_annual ?? 0) || 0);
  let effective = employment + benefits * 1.25;
  if (effective <= 0 && passport.annual_income) {
    // Fallback for legacy passports without a breakdown.
    effective = Number(passport.annual_income) || 0;
  }
  if (effective <= 0) return null;
  const annualRent = monthlyRent * 12;
  return {
    employment,
    benefits,
    effectiveCapacity: effective,
    ratio: effective / annualRent,
    annualRent,
  };
}

function AffordabilityBadge({
  passport,
  monthlyRent,
}: {
  passport: Passport | null | undefined;
  monthlyRent: number | null | undefined;
}) {
  const result = computeAffordability(passport, monthlyRent);
  if (!result) return null;
  const rounded = Math.round(result.ratio * 10) / 10;
  const tooltip = `Effective annual capacity £${Math.round(result.effectiveCapacity).toLocaleString()} vs £${result.annualRent.toLocaleString()} annual rent (benefits weighted 1.25×). Covered threshold: 2.5× annual rent (30× monthly).`;
  if (result.ratio >= 2.5) {
    return (
      <span
        title={tooltip}
        className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700"
      >
        <TrendingUp className="h-3 w-3" strokeWidth={2.5} />
        Affordability: Covered ({rounded.toFixed(1)}x)
      </span>
    );
  }
  return (
    <span
      title={tooltip}
      className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800"
    >
      <TrendingUp className="h-3 w-3" strokeWidth={2.5} />
      Affordability: Guarantor Recommended ({rounded.toFixed(1)}x)
    </span>
  );
}

function ApaPill() {
  return (
    <span
      title="Tenant is willing to have Housing Element paid directly to the landlord (Alternative Payment Arrangement)."
      className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-700"
    >
      <BadgeCheck className="h-3 w-3" strokeWidth={2.5} />
      Direct Payment (APA) Offered
    </span>
  );
}

function IncomeBreakdownBlock({
  passport,
  monthlyRent,
}: {
  passport: Passport | null;
  monthlyRent: number | null | undefined;
}) {
  const result = computeAffordability(passport, monthlyRent);
  if (!passport || !result) return null;
  const bd = passport.income_breakdown ?? {};
  const rows: Array<{ label: string; amount: number }> = [
    { label: "Salary / self-employment", amount: result.employment },
    { label: "Universal Credit", amount: Number(bd.universal_credit_annual ?? 0) || 0 },
    { label: "Housing Element", amount: Number(bd.housing_element_annual ?? 0) || 0 },
    { label: "Disability benefits", amount: Number(bd.disability_benefits_annual ?? 0) || 0 },
    { label: "Other benefits", amount: Number(bd.other_benefits_annual ?? 0) || 0 },
  ].filter((r) => r.amount > 0);
  return (
    <div className="rounded-2xl border border-border bg-surface p-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Income breakdown
      </p>
      <ul className="mt-2 divide-y divide-border text-sm">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-3 py-1.5">
            <span className="text-foreground/80">{r.label}</span>
            <span className="font-medium text-foreground">£{Math.round(r.amount).toLocaleString()}/yr</span>
          </li>
        ))}
      </ul>
      {result.benefits > 0 ? (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-surface-muted/60 px-2.5 py-1.5 text-[11px] text-muted-foreground">
          <span>Benefits (tax-free) subtotal</span>
          <span className="font-medium text-foreground">£{Math.round(result.benefits).toLocaleString()}/yr</span>
        </div>
      ) : null}
      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs">
        <span className="font-semibold uppercase tracking-wider text-emerald-700">
          Effective capacity (1.25× benefits)
        </span>
        <span className="font-display text-sm font-semibold tracking-tight text-emerald-800">
          £{Math.round(result.effectiveCapacity).toLocaleString()}/yr
        </span>
      </div>
    </div>
  );
}

function IncomeSummaryRow({
  shareId,
  employmentStatus,
  hasIncomeDoc,
}: {
  shareId: string;
  employmentStatus: string | null;
  hasIncomeDoc: boolean;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <Briefcase className="h-3 w-3" />
        <span className="text-foreground/90 font-medium">{formatEmployment(employmentStatus)}</span>
      </span>
      <span aria-hidden className="text-border">·</span>
      <span>Employer: <span className="text-foreground/80">Self-reported</span></span>
      {hasIncomeDoc ? (
        <>
          <span aria-hidden className="text-border">·</span>
          <ViewIncomeDocButton shareId={shareId} />
        </>
      ) : (
        <>
          <span aria-hidden className="text-border">·</span>
          <span className="italic">No income document on file</span>
        </>
      )}
    </div>
  );
}

function ViewIncomeDocButton({ shareId }: { shareId: string }) {
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const onOpen = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { url } = await signIncomeDocumentUrl({ data: { share_id: shareId } });
      if (!url) throw new Error("No URL");
      window.open(url, "_blank", "noopener,noreferrer");
      setFailed(false);
    } catch (err) {
      setFailed(true);
      toast.error("Couldn't open income document", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };
  if (failed) {
    return (
      <button
        type="button"
        onClick={onOpen}
        disabled={loading}
        className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-800 transition hover:bg-amber-100 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
        Refresh income link
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={loading}
      className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
      View income document
    </button>
  );
}

function ViewIdDocButton({ shareId }: { shareId: string }) {
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const onOpen = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { url } = await signIdDocumentUrl({ data: { share_id: shareId } });
      if (!url) throw new Error("No URL");
      window.open(url, "_blank", "noopener,noreferrer");
      setFailed(false);
    } catch (err) {
      setFailed(true);
      toast.error("Couldn't open document", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };
  if (failed) {
    return (
      <button
        type="button"
        onClick={onOpen}
        disabled={loading}
        className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800 transition hover:bg-amber-100 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
        Refresh document link
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={loading}
      className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
      View ID document
    </button>
  );
}

function StatusPill({ status }: { status: Status }) {
  if (status === "accepted") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-verified px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-verified-foreground)]">
        <ShieldCheck className="h-3 w-3" />
        Accepted
      </span>
    );
  }
  if (status === "reviewed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground">
        Reviewed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      <Clock className="h-3 w-3" />
      Pending
    </span>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function PassportModal({
  share,
  passport,
  onAccept,
  onClose,
}: {
  share: Share;
  passport: Passport | null;
  onAccept: () => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-foreground/30 px-4 py-6 backdrop-blur-sm sm:place-items-center">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_24px_64px_-24px_rgba(15,23,42,0.35)]">
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Tenant Passport
            </p>
            <h3 className="mt-1 truncate font-display text-lg font-semibold tracking-tight">
              {share.tenant?.full_name || "Verified tenant"}
            </h3>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              For {share.listing?.title ?? "your listing"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full border border-border bg-surface text-foreground/70 transition hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex flex-wrap gap-2">
            {passport?.id_status === "self_certified" ? (
              <SelfCertifiedIdBadge country={passport.issuing_country} verifiedAt={passport.id_verified_at} />
            ) : (
              <VerifyBadge label="Identity" ok={!!passport?.identity_verified} />
            )}
            <VerifyBadge label="Income" ok={!!passport?.income_verified} />
            <VerifyBadge label="References" ok={!!passport?.reference_verified} />
            <VerifyBadge label="Right to rent" ok={!!passport?.right_to_rent_verified} />
            <AffordabilityBadge
              passport={passport}
              monthlyRent={share.listing?.monthly_rent ?? null}
            />
            {passport?.willing_direct_payment_apa ? <ApaPill /> : null}
          </div>

          <IncomeSummaryRow
            shareId={share.id}
            employmentStatus={passport?.employment_status ?? null}
            hasIncomeDoc={!!passport?.income_document_path}
          />

          <IncomeBreakdownBlock passport={passport} monthlyRent={share.listing?.monthly_rent ?? null} />

          {passport?.id_document_path ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-3.5 py-2.5">
              <div className="min-w-0 text-xs text-emerald-800">
                <p className="font-semibold">Identity document on file</p>
                <p className="text-emerald-700/80">
                  Self-certified by tenant · shared with this application
                </p>
              </div>
              <ViewIdDocButton shareId={share.id} />
            </div>
          ) : null}

          <dl className="divide-y divide-border rounded-2xl border border-border bg-surface-muted/50 text-sm">
            <Row k="Monthly net income" v={passport?.monthly_income_net ? `£${Number(passport.monthly_income_net).toLocaleString()}` : "—"} />
            {passport?.id_verified_at ? (
              <Row
                k="ID verified"
                v={new Date(passport.id_verified_at).toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              />
            ) : null}
            <Row k="Shared" v={timeAgo(share.shared_at)} />
          </dl>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border bg-surface-muted/40 p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-medium text-foreground transition hover:bg-secondary"
          >
            Close
          </button>
          {share.status === "accepted" ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate({ to: "/landlord/issue-lease", search: { share: share.id } });
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition hover:brightness-110"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Prepare &amp; Issue Lease
            </button>
          ) : (
            <button
              type="button"
              onClick={onAccept}
              className="inline-flex items-center gap-1.5 rounded-full bg-verified px-4 py-2 text-xs font-semibold text-[var(--color-verified-foreground)] transition hover:brightness-95"
            >
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
              Accept applicant
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{k}</dt>
      <dd className="text-sm font-medium text-foreground">{v}</dd>
    </div>
  );
}