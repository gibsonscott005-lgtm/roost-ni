import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Clock, Inbox, ShieldCheck, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/dashboard-shell";

export const Route = createFileRoute("/_authenticated/dashboard/applications")({
  validateSearch: z.object({ listing: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Received Passports — Roost NI" },
      {
        name: "description",
        content: "Review verified Tenant Passports submitted to your NI listings.",
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
  tenant: { id: string; full_name: string } | null;
  listing: { id: string; title: string } | null;
}

interface Passport {
  user_id: string;
  identity_verified: boolean;
  income_verified: boolean;
  reference_verified: boolean;
  right_to_rent_verified: boolean;
  monthly_income_net: number | null;
  preferred_heating: string | null;
  accept_empty_in_full_out: boolean;
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
          "id, status, shared_at, tenant_id, listing_id, tenant:profiles!tenant_id(id, full_name), listing:property_listings!listing_id(id, title)",
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
            "user_id, identity_verified, income_verified, reference_verified, right_to_rent_verified, monthly_income_net, preferred_heating, accept_empty_in_full_out",
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
        .update({ status: "accepted" })
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
    },
    onError: (err: unknown) => {
      toast.error("Could not update", {
        description: err instanceof Error ? err.message : "Please try again",
      });
    },
  });
  const accept = (share: Share) => acceptMutation.mutate(share);

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
              Verified tenants who applied to your live listings.
            </p>
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
            <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-muted-foreground">
              Loading applicants…
            </div>
          ) : shares.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-surface p-10 text-center">
              <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-display text-base font-semibold tracking-tight">
                No applications yet
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                When a tenant shares their passport with one of your listings, they'll appear here.
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
                const verifiedCount = p
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
                        {s.tenant?.full_name || "Verified tenant"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        Applied to <span className="text-foreground/90">{s.listing?.title ?? "your listing"}</span> · {timeAgo(s.shared_at)}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <VerifyBadge label="ID" ok={!!p?.identity_verified} />
                        <VerifyBadge label="Income" ok={!!p?.income_verified} />
                        <VerifyBadge label="References" ok={!!p?.reference_verified} />
                        <VerifyBadge label="Right to rent" ok={!!p?.right_to_rent_verified} />
                        <span className="ml-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {verifiedCount}/4
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusPill status={s.status} />
                      {s.status === "accepted" ? (
                        <button
                          type="button"
                          onClick={() =>
                            navigate({ to: "/landlord/issue-lease", search: { share: s.id } })
                          }
                          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-2 text-xs font-semibold text-background transition hover:brightness-110"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Issue lease
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
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
        ok ? "bg-verified-soft text-verified" : "bg-surface-muted text-muted-foreground"
      }`}
    >
      {ok ? <Check className="h-3 w-3" strokeWidth={3} /> : <Clock className="h-3 w-3" />}
      {label}
    </span>
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
          <div className="grid grid-cols-2 gap-2">
            <VerifyBadge label="Identity" ok={!!passport?.identity_verified} />
            <VerifyBadge label="Income" ok={!!passport?.income_verified} />
            <VerifyBadge label="References" ok={!!passport?.reference_verified} />
            <VerifyBadge label="Right to rent" ok={!!passport?.right_to_rent_verified} />
          </div>

          <dl className="divide-y divide-border rounded-2xl border border-border bg-surface-muted/50 text-sm">
            <Row k="Monthly net income" v={passport?.monthly_income_net ? `£${Number(passport.monthly_income_net).toLocaleString()}` : "—"} />
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