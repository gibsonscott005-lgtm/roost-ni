import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useState } from "react";
import type React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, Briefcase, Check, Clock, ExternalLink, Inbox, Loader2, RefreshCw, ShieldCheck, TrendingUp, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { emitNotification, type EmitNotificationInput } from "@/lib/notifications.functions";
import { signIdDocumentUrl, signIncomeDocumentUrl } from "@/lib/identity-docs.functions";
import { getApplicantPassports } from "@/lib/passport-inbox.functions";
import { declineApplication, requestApplicantInfo, type INFO_REQUEST_ITEMS } from "@/lib/application-review.functions";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { identityTier } from "@/lib/identity-verification";

type InfoItem = (typeof INFO_REQUEST_ITEMS)[number];

function notify(payload: EmitNotificationInput) {
  emitNotification({ data: payload }).catch((err) =>
    console.error("[notify]", err),
  );
}

export const Route = createFileRoute("/_authenticated/dashboard/applications")({
  staticData: { sitemap: false },
  validateSearch: z.object({ listing: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Applications — RoostNI" },
      {
        name: "description",
        content:
          "Review self-certified Tenant Passports submitted to your NI listings. RoostNI organises the information — the letting decision stays yours.",
      },
    ],
  }),
  component: ApplicationsPage,
});

type Status = "pending" | "reviewed" | "accepted" | "withdrawn" | "declined";

interface Share {
  id: string;
  status: Status;
  shared_at: string;
  withdrawn_at: string | null;
  withdrawn_reason: string | null;
  declined_at: string | null;
  info_requested_at: string | null;
  info_requested_items: string[];
  tenant_id: string;
  listing_id: string;
  lease_status: string | null;
  lease_signed_at: string | null;
  lease_signed_name: string | null;
  tenant: { id: string; full_name: string } | null;
  listing: { id: string; title: string; monthly_rent: number | null; deposit: number | null } | null;
}

interface Passport {
  user_id: string;
  identity_verified: boolean;
  income_verified: boolean;
  reference_verified: boolean;
  income_provided?: boolean;
  reference_provided?: boolean;
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

type FilterKey = "all" | "pending" | "reviewed" | "accepted" | "declined";
const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "reviewed", label: "Reviewed" },
  { key: "accepted", label: "Accepted" },
  { key: "declined", label: "Declined" },
];

function ApplicationsPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
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
          "id, status, shared_at, withdrawn_at, withdrawn_reason, declined_at, info_requested_at, info_requested_items, tenant_id, listing_id, lease_status, lease_signed_at, lease_signed_name, tenant:profiles!tenant_id(id, full_name), listing:property_listings!listing_id(id, title, monthly_rent, deposit)",
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
        // Served through a server function: landlords no longer read pending
        // applicants' passport rows directly, and only screening fields come back.
        const { passports: rows } = await getApplicantPassports();
        ((rows as unknown as Passport[] | null) ?? []).forEach((row) => {
          passports[row.user_id] = row;
        });
      }
      return { shares: list, passports, listingCount: count ?? 0 };
    },
  });

  const allShares = inboxQuery.data?.shares ?? [];
  const scoped = listingFilter ? allShares.filter((s) => s.listing_id === listingFilter) : allShares;
  const activeShares = scoped.filter((s) => s.status !== "withdrawn");
  const withdrawnShares = scoped.filter((s) => s.status === "withdrawn");
  const visible = activeShares.filter((s) =>
    filter === "all" ? s.status !== "declined" : s.status === filter,
  );
  const passports = inboxQuery.data?.passports ?? {};
  const listingCount = inboxQuery.data?.listingCount ?? 0;
  const loading = inboxQuery.isPending && isLandlord;
  const openShare = openId ? allShares.find((s) => s.id === openId) ?? null : null;

  const groups = (() => {
    const map = new Map<string, { title: string; items: Share[] }>();
    for (const s of visible) {
      const g = map.get(s.listing_id) ?? { title: s.listing?.title ?? "Your listing", items: [] };
      g.items.push(s);
      map.set(s.listing_id, g);
    }
    return Array.from(map.entries());
  })();

  const counts: Record<FilterKey, number> = {
    all: activeShares.filter((s) => s.status !== "declined").length,
    pending: activeShares.filter((s) => s.status === "pending").length,
    reviewed: activeShares.filter((s) => s.status === "reviewed").length,
    accepted: activeShares.filter((s) => s.status === "accepted").length,
    declined: activeShares.filter((s) => s.status === "declined").length,
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["landlord-applications"] });
    queryClient.invalidateQueries({ queryKey: ["passport-share"] });
  };

  const acceptMutation = useMutation({
    mutationFn: async (share: Share) => {
      const rent = Number(share.listing?.monthly_rent ?? 0);
      const deposit = Number(share.listing?.deposit ?? 0);
      if (rent > 0 && deposit > rent) {
        throw new Error("Deposit exceeds one month's rent (PTA NI 2022). Edit the listing first.");
      }
      const { error } = await supabase
        .from("passport_shares")
        .update({ status: "accepted", landlord_checks_confirmed_at: new Date().toISOString() })
        .eq("id", share.id);
      if (error) throw error;
      const { error: listingErr } = await supabase
        .from("property_listings")
        .update({ status: "under_offer" })
        .eq("id", share.listing_id);
      if (listingErr) throw listingErr;
      return share;
    },
    onSuccess: (share) => {
      toast.success("Application accepted", {
        description: `${share.tenant?.full_name ?? "Tenant"} accepted. Listing marked as Under Offer.`,
        action: {
          label: "Issue lease",
          onClick: () => navigate({ to: "/landlord/issue-lease", search: { share: share.id } }),
        },
      });
      refresh();
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
      toast.error("Could not accept", {
        description: err instanceof Error ? err.message : "Please try again",
      });
    },
  });

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
      refresh();
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

  return (
    <DashboardShell
      user={user}
      profile={profile}
      activeKey="applications"
      listingsCount={listingCount}
      applicationsCount={counts.all}
    >
      {!isLandlord ? (
        <div className="rounded-sm border border-border bg-surface p-6 text-sm text-muted-foreground sm:p-8">
          Received passports are visible to landlord accounts only.
        </div>
      ) : (
        <div>
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Inbox</p>
            <h2 className="mt-1 font-display text-xl font-semibold tracking-tight sm:text-2xl">Applications</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Self-certified applicants who applied to your live listings, grouped by property.
            </p>
            <HowRoostWorksPanel />
            {listingFilter ? (
              <div className="mt-3 flex w-fit flex-wrap items-center gap-2 rounded-full border border-border bg-surface-muted/60 px-3 py-1.5 text-xs text-muted-foreground">
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
            <div role="tablist" aria-label="Filter applications" className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-selected={filter === f.key}
                  onClick={() => setFilter(f.key)}
                  className={`min-h-9 shrink-0 rounded-full border px-3.5 text-xs font-medium transition ${
                    filter === f.key
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-surface text-foreground hover:bg-secondary"
                  }`}
                >
                  {f.label} <span className="opacity-60">({counts[f.key]})</span>
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3" aria-busy="true" aria-label="Loading applicants">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-sm" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="rounded-sm border border-dashed border-border bg-surface p-10 text-center">
              <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-display text-base font-semibold tracking-tight">
                {filter === "all" ? "No applications yet — inbox is clear" : "Nothing in this view"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                When a tenant shares their RoostNI passport with one of your listings, they'll land here with a full self-certified summary.
              </p>
              <Link
                to="/dashboard"
                className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
              >
                Back to properties
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {groups.map(([listingId, g]) => (
                <section key={listingId} aria-label={g.title}>
                  <div className="mb-2 flex items-center gap-2">
                    <h3 className="truncate font-display text-base font-semibold tracking-tight">{g.title}</h3>
                    <span className="shrink-0 rounded-full bg-verified-soft px-2 py-0.5 text-[11px] font-semibold text-verified">
                      {g.items.length} applicant{g.items.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <ul className="grid gap-3 md:grid-cols-2">
                    {g.items.map((s) => {
                      const p = passports[s.tenant_id];
                      return (
                        <li
                          key={s.id}
                          className="flex flex-col gap-3 rounded-sm border border-border bg-surface p-4 shadow-floating"
                        >
                          <div className="flex items-start gap-3">
                            <Initials name={s.tenant?.full_name} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="truncate font-display text-base font-semibold tracking-tight">
                                  {s.tenant?.full_name || "Applicant"}
                                </p>
                                <StatusPill status={s.status} />
                              </div>
                              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                <Briefcase className="h-3 w-3" />
                                {formatEmployment(p?.employment_status ?? null)} · applied {formatDate(s.shared_at)}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <EvidenceBadge passport={p} />
                            <AffordabilityBadge passport={p ?? null} monthlyRent={s.listing?.monthly_rent ?? null} />
                            {p?.willing_direct_payment_apa ? <ApaPill /> : null}
                            {s.info_requested_at && s.status === "reviewed" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                <Clock className="h-3 w-3" /> Info requested
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-auto flex flex-wrap items-center justify-end gap-2">
                            {s.status === "accepted" &&
                            s.lease_status !== "signed_pending_landlord" &&
                            s.lease_status !== "counter_signed" ? (
                              <button
                                type="button"
                                onClick={() => navigate({ to: "/landlord/issue-lease", search: { share: s.id } })}
                                className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-xs font-semibold text-background transition hover:brightness-110"
                              >
                                <ShieldCheck className="h-3.5 w-3.5" />
                                {s.lease_status === "sent_to_tenant" ? "View lease" : "Issue lease"}
                              </button>
                            ) : null}
                            {s.lease_status === "signed_pending_landlord" ? (
                              <button
                                type="button"
                                onClick={() => countersignMutation.mutate(s)}
                                className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-verified px-3.5 text-xs font-semibold text-[var(--color-verified-foreground)] transition hover:brightness-95"
                              >
                                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                Counter-sign
                              </button>
                            ) : null}
                            {s.lease_status === "counter_signed" ? (
                              <button
                                type="button"
                                onClick={() => navigate({ to: "/landlord/manage-tenancy", search: { share: s.id } })}
                                className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-xs font-semibold text-background transition hover:brightness-110"
                              >
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Manage tenancy
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => setOpenId(s.id)}
                              className="min-h-10 rounded-full border border-border bg-surface-muted px-3.5 text-xs font-medium text-foreground transition hover:bg-secondary"
                            >
                              View passport
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}

          {!loading && withdrawnShares.length > 0 ? (
            <div className="mt-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Withdrawn ({withdrawnShares.length})
              </p>
              <ul className="mt-2 overflow-hidden rounded-sm border border-dashed border-border bg-surface-muted/40">
                {withdrawnShares.map((s, i) => (
                  <li
                    key={s.id}
                    className={`flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between ${i > 0 ? "border-t border-border" : ""}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-display text-sm font-semibold tracking-tight text-muted-foreground">
                        {s.tenant?.full_name || "Applicant"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {s.listing?.title ?? "Your listing"} · {s.withdrawn_at ? `withdrawn ${timeAgo(s.withdrawn_at)}` : "withdrawn"}
                        {s.withdrawn_reason ? ` · "${s.withdrawn_reason}"` : ""}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">Passport access revoked by the applicant.</p>
                    </div>
                    <StatusPill status={s.status} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}

      <PassportSheet
        share={openShare}
        passport={openShare ? passports[openShare.tenant_id] ?? null : null}
        onAccept={(s) => acceptMutation.mutate(s)}
        accepting={acceptMutation.isPending}
        onChanged={refresh}
        onClose={() => setOpenId(null)}
      />
    </DashboardShell>
  );
}

function VerifyBadge({ label, ok, provided = false }: { label: string; ok: boolean; provided?: boolean }) {
  if (!ok && provided) {
    return (
      <span
        title={`${label}: evidence provided by the applicant. Not independently checked by RoostNI.`}
        className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/80"
      >
        <Check className="h-3 w-3" strokeWidth={3} />
        {label} provided
      </span>
    );
  }
  return (
    <span
      title={ok ? `${label}: independently verified.` : `${label}: not yet provided by the applicant.`}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
        ok ? "bg-verified-soft text-verified" : "bg-surface-muted text-muted-foreground"
      }`}
    >
      {ok ? <Check className="h-3 w-3" strokeWidth={3} /> : <Clock className="h-3 w-3" />}
      {label}
    </span>
  );
}

/** States plainly what RoostNI does and does not do, where the decision is made. */
function HowRoostWorksPanel() {
  return (
    <div className="mt-4 rounded-sm border border-border bg-surface-muted/50 p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <Info className="h-3.5 w-3.5" />
        How RoostNI works
      </p>
      <p className="mt-2 text-sm text-foreground">
        RoostNI collects and organises what an applicant tells you, and keeps a timestamped record
        of it. <strong>RoostNI does not vet, reference or recommend tenants</strong>, and it does not
        rank or score them. Whether to let is your decision, and your own checks still apply.
      </p>
    </div>
  );
}

/** Sits beside the claims so the boundary is impossible to miss. */
function ChecksSplit({ idVerified = false }: { idVerified?: boolean }) {
  const checked = [
    ...(idVerified
      ? [
          "Identity — the document was checked for authenticity and matched to a live selfie by our verification provider",
        ]
      : []),
    "A document was uploaded and is attached to this application",
    "The income figures the applicant entered add up",
    "The declaration is timestamped and cannot be edited after the fact",
  ];
  const yours = [
    ...(idVerified
      ? ["Identity — satisfy yourself the person viewing is the person verified"]
      : ["Identity — compare the document against the person"]),
    "Employment — contact the employer directly",
    "Previous landlord — take up the reference yourself",
    "Credit history — RoostNI does not run credit checks",
  ];
  return (
    <div className="grid gap-3 rounded-sm border border-border bg-surface p-3.5 sm:grid-cols-2">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-verified">
          What RoostNI checked
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

/**
 * One badge for the identity claim, honest about which tier it is:
 * a provider-checked ID and a tenant-uploaded photo are not the same thing.
 */
function IdBadge({ passport }: { passport: Passport | null }) {
  const tier = passport
    ? identityTier({ id_status: passport.id_status, id_document_path: passport.id_document_path })
    : "none";

  if (tier === "verified") {
    const when = passport?.id_verified_at
      ? new Date(passport.id_verified_at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : null;
    return (
      <span
        title={`Document authenticity and face match confirmed by an identity provider${when ? ` on ${when}` : ""}. RoostNI still does not vouch for this applicant.`}
        className="inline-flex items-center gap-1 rounded-full border border-verified/30 bg-verified-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-verified"
      >
        <ShieldCheck className="h-3 w-3" strokeWidth={2.5} />
        ID Verified{passport?.issuing_country ? ` (${passport.issuing_country})` : ""}
      </span>
    );
  }

  if (tier === "self_certified") {
    return (
      <SelfCertifiedIdBadge
        country={passport?.issuing_country ?? null}
        verifiedAt={passport?.id_verified_at ?? null}
      />
    );
  }

  if (tier === "pending") {
    return (
      <span
        title="The applicant has started an identity check that has not finished yet."
        className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
      >
        <Clock className="h-3 w-3" />
        ID check in progress
      </span>
    );
  }

  if (tier === "failed") {
    return (
      <span
        title="An identity check was attempted and did not complete. This is not a judgement on the applicant — checks fail for ordinary reasons such as poor lighting or an expired document."
        className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700"
      >
        <Clock className="h-3 w-3" />
        ID check not completed
      </span>
    );
  }

  return <VerifyBadge label="ID" ok={false} />;
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
  const tooltip = `Calculation only, from figures the applicant entered: £${Math.round(result.effectiveCapacity).toLocaleString()} declared annual capacity ÷ £${result.annualRent.toLocaleString()} annual rent = ${rounded.toFixed(1)}× (benefits weighted 1.25×). A common landlord benchmark is 2.5×. RoostNI is not assessing this applicant — the judgement is yours.`;
  if (result.ratio >= 2.5) {
    return (
      <span
        title={tooltip}
        className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700"
      >
        <TrendingUp className="h-3 w-3" strokeWidth={2.5} />
        Income cover {rounded.toFixed(1)}× rent
      </span>
    );
  }
  return (
    <span
      title={tooltip}
      className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800"
    >
      <TrendingUp className="h-3 w-3" strokeWidth={2.5} />
      Income cover {rounded.toFixed(1)}× rent — below 2.5×
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
    <div className="rounded-sm border border-border bg-surface p-3.5">
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
  if (status === "withdrawn" || status === "declined") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-destructive">
        {status === "declined" ? "Declined" : "Withdrawn"}
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

const INFO_OPTIONS: Array<{ key: InfoItem; label: string }> = [
  { key: "updated_payslip", label: "Updated payslip" },
  { key: "bank_statement", label: "Recent bank statement" },
  { key: "guarantor_details", label: "Guarantor details" },
  { key: "previous_landlord_contact", label: "Previous landlord contact" },
  { key: "employer_contact", label: "Employer contact details" },
  { key: "viewing_availability", label: "Availability for a viewing" },
];

function PassportSheet({
  share,
  passport,
  onAccept,
  accepting,
  onChanged,
  onClose,
}: {
  share: Share | null;
  passport: Passport | null;
  onAccept: (s: Share) => void;
  accepting: boolean;
  onChanged: () => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [ownChecksDone, setOwnChecksDone] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoItems, setInfoItems] = useState<InfoItem[]>([]);
  const [infoMessage, setInfoMessage] = useState("");

  const declineMutation = useMutation({
    mutationFn: (s: Share) =>
      declineApplication({ data: { shareId: s.id, reason: declineReason || undefined } }),
    onSuccess: (res) => {
      toast.success("Application declined", {
        description: `The applicant has been notified and your document access has ended.${res.relisted ? " Listing is available again." : ""}`,
      });
      setDeclineOpen(false);
      setDeclineReason("");
      onChanged();
      onClose();
    },
    onError: (err: unknown) =>
      toast.error("Could not decline", {
        description: err instanceof Error ? err.message : "Please try again",
      }),
  });

  const infoMutation = useMutation({
    mutationFn: (s: Share) =>
      requestApplicantInfo({
        data: { shareId: s.id, items: infoItems, message: infoMessage || undefined },
      }),
    onSuccess: () => {
      toast.success("Request sent", { description: "The applicant has been asked for the extra information." });
      setInfoOpen(false);
      setInfoItems([]);
      setInfoMessage("");
      onChanged();
    },
    onError: (err: unknown) =>
      toast.error("Could not send request", {
        description: err instanceof Error ? err.message : "Please try again",
      }),
  });

  const rent = Number(share?.listing?.monthly_rent ?? 0);
  const deposit = Number(share?.listing?.deposit ?? 0);
  const depositOverCap = rent > 0 && deposit > rent;
  const open = share !== null;
  const isOpenApp = share ? share.status === "pending" || share.status === "reviewed" : false;

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setOwnChecksDone(false);
          onClose();
        }
      }}
    >
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        {share ? (
          <>
            <SheetHeader className="border-b border-border p-5 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Tenant Passport · read-only
              </p>
              <div className="flex items-center gap-3">
                <Initials name={share.tenant?.full_name} />
                <div className="min-w-0">
                  <SheetTitle className="truncate font-display text-lg tracking-tight">
                    {share.tenant?.full_name || "Applicant"}
                  </SheetTitle>
                  <SheetDescription className="truncate text-xs">
                    For {share.listing?.title ?? "your listing"} · applied {formatDate(share.shared_at)}
                  </SheetDescription>
                </div>
              </div>
              <div className="pt-1">
                <EvidenceBadge passport={passport} />
              </div>
            </SheetHeader>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {share.info_requested_at ? (
                <div className="rounded-sm border border-border bg-surface-muted/60 p-3 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">
                    More information requested {timeAgo(share.info_requested_at)}
                  </p>
                  <p className="mt-0.5">
                    {share.info_requested_items
                      .map((k) => INFO_OPTIONS.find((o) => o.key === k)?.label ?? k)
                      .join(" · ")}
                  </p>
                </div>
              ) : null}

              <Section title="Identity & contact">
                <div className="flex flex-wrap items-center gap-2">
                  <IdBadge passport={passport} />
                  {passport?.id_document_path && share.status !== "declined" ? (
                    <ViewIdDocButton shareId={share.id} />
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Contact details and full references are released once you accept — keeping
                  applicant data private until there is a genuine offer.
                </p>
              </Section>

              <Section title="Employment & income">
                <div className="flex flex-wrap items-center gap-2">
                  <VerifyBadge label="Income" ok={!!passport?.income_verified} provided={!!passport?.income_provided} />
                  <AffordabilityBadge passport={passport} monthlyRent={share.listing?.monthly_rent ?? null} />
                  {passport?.willing_direct_payment_apa ? <ApaPill /> : null}
                </div>
                <IncomeSummaryRow
                  shareId={share.id}
                  employmentStatus={passport?.employment_status ?? null}
                  hasIncomeDoc={!!passport?.income_document_path && share.status !== "declined"}
                />
                <div className="mt-3">
                  <IncomeBreakdownBlock passport={passport} monthlyRent={share.listing?.monthly_rent ?? null} />
                </div>
                <dl className="mt-3 divide-y divide-border rounded-sm border border-border bg-surface-muted/50 text-sm">
                  <Row
                    k="Monthly net income (declared)"
                    v={passport?.monthly_income_net ? `£${Number(passport.monthly_income_net).toLocaleString()}` : "—"}
                  />
                </dl>
              </Section>

              <Section title="Previous landlord references">
                <VerifyBadge label="References" ok={!!passport?.reference_verified} provided={!!passport?.reference_provided} />
                <p className="mt-2 text-xs text-muted-foreground">
                  {passport?.reference_provided
                    ? "Reference evidence is attached. Take up the reference with the previous landlord yourself."
                    : "No reference evidence attached yet. You can request it below."}
                </p>
              </Section>

              <ChecksSplit idVerified={passport?.id_status === "verified"} />
            </div>

            <div className="border-t border-border bg-surface-muted/40 p-4">
              {isOpenApp ? (
                <>
                  {depositOverCap ? (
                    <p className="mb-3 rounded-sm border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                      This listing's deposit (£{deposit.toLocaleString()}) is more than one month's rent
                      (£{rent.toLocaleString()}). Under the Private Tenancies Act (NI) 2022 the deposit
                      cannot exceed one month's rent — edit the listing before accepting.
                    </p>
                  ) : null}
                  <label className="mb-3 flex cursor-pointer items-start gap-2.5 rounded-sm border border-border bg-surface p-3 text-xs text-foreground">
                    <input
                      type="checkbox"
                      checked={ownChecksDone}
                      onChange={(e) => setOwnChecksDone(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-verified)]"
                    />
                    <span>
                      I have carried out my own checks on this applicant and I understand RoostNI has not
                      vetted, referenced or recommended them. This letting decision is mine.
                    </span>
                  </label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => setDeclineOpen(true)}
                      className="min-h-11 rounded-full border border-border bg-surface px-4 py-2 text-xs font-medium text-destructive transition hover:bg-destructive/10"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      onClick={() => setInfoOpen(true)}
                      className="min-h-11 rounded-full border border-border bg-surface px-4 py-2 text-xs font-medium text-foreground transition hover:bg-secondary"
                    >
                      Request more info
                    </button>
                    <button
                      type="button"
                      onClick={() => onAccept(share)}
                      disabled={!ownChecksDone || depositOverCap || accepting}
                      title={!ownChecksDone ? "Confirm your own checks first" : undefined}
                      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-verified px-4 py-2 text-xs font-semibold text-[var(--color-verified-foreground)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {accepting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      Accept application
                    </button>
                  </div>
                </>
              ) : share.status === "accepted" ? (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {!share.lease_status ? (
                    <button
                      type="button"
                      onClick={() => setDeclineOpen(true)}
                      className="min-h-11 rounded-full border border-border bg-surface px-4 py-2 text-xs font-medium text-destructive transition hover:bg-destructive/10"
                    >
                      Withdraw offer & decline
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate({ to: "/landlord/issue-lease", search: { share: share.id } });
                    }}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition hover:brightness-110"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Prepare &amp; issue lease
                  </button>
                </div>
              ) : (
                <p className="text-center text-xs text-muted-foreground">
                  This application is {share.status}. Document access has ended.
                </p>
              )}
            </div>

            <AlertDialog open={declineOpen} onOpenChange={setDeclineOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Decline this application?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {share.tenant?.full_name || "The applicant"} will be told their application isn't
                    progressing, and your access to their passport documents ends straight away. This
                    can't be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value.slice(0, 300))}
                  placeholder="Private note for your records (optional, not shown to the applicant)"
                  className="min-h-20 w-full rounded-xl border border-border bg-surface p-3 text-sm"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep application</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      declineMutation.mutate(share);
                    }}
                    disabled={declineMutation.isPending}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {declineMutation.isPending ? "Declining…" : "Decline application"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request more information</DialogTitle>
                  <DialogDescription>
                    Choose what you need. The applicant gets an in-app prompt; their application stays open.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2">
                  {INFO_OPTIONS.map((o) => {
                    const checked = infoItems.includes(o.key);
                    return (
                      <label
                        key={o.key}
                        className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-surface px-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setInfoItems((cur) =>
                              checked ? cur.filter((k) => k !== o.key) : [...cur, o.key],
                            )
                          }
                          className="h-4 w-4 accent-[var(--color-verified)]"
                        />
                        {o.label}
                      </label>
                    );
                  })}
                </div>
                <textarea
                  value={infoMessage}
                  onChange={(e) => setInfoMessage(e.target.value.slice(0, 400))}
                  placeholder="Optional short note to the applicant"
                  className="min-h-20 w-full rounded-xl border border-border bg-surface p-3 text-sm"
                />
                <DialogFooter>
                  <button
                    type="button"
                    onClick={() => infoMutation.mutate(share)}
                    disabled={infoItems.length === 0 || infoMutation.isPending}
                    className="min-h-11 rounded-full bg-verified px-5 py-2 text-sm font-semibold text-[var(--color-verified-foreground)] disabled:opacity-50"
                  >
                    {infoMutation.isPending ? "Sending…" : "Send request"}
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-sm border border-border bg-surface p-4">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
      {children}
    </section>
  );
}

function Initials({ name }: { name: string | null | undefined }) {
  const initials =
    (name ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?";
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-verified-soft font-display text-sm font-semibold text-verified">
      {initials}
    </span>
  );
}

function evidenceCount(p: Passport | null | undefined) {
  if (!p) return 0;
  return [
    !!p.id_document_path || p.identity_verified,
    p.income_verified || p.income_provided,
    p.reference_verified || p.reference_provided,
  ].filter(Boolean).length;
}

function EvidenceBadge({ passport }: { passport: Passport | null | undefined }) {
  const n = evidenceCount(passport);
  const complete = n === 3;
  return (
    <span
      title="Evidence supplied by the applicant. RoostNI does not vet tenants — your own checks still apply."
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
        complete ? "bg-verified-soft text-verified" : "bg-surface-muted text-muted-foreground"
      }`}
    >
      <BadgeCheck className="h-3 w-3" />
      {complete ? "Self-Certified • Complete (3/3 evidence attached)" : `Self-Certified • ${n}/3 evidence attached`}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{k}</dt>
      <dd className="text-sm font-medium text-foreground">{v}</dd>
    </div>
  );
}