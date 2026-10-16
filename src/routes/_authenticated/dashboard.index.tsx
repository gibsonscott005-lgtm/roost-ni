import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  reapplyApplication,
  withdrawApplication,
} from "@/lib/application-withdraw.functions";
import { notifyListingPublished } from "@/lib/listing-alerts.functions";
import {
  Building2,
  Check,
  ChevronDown,
  Flame,
  Info,
  MapPin,
  Plus,
  PoundSterling,
  ShieldCheck,
  Sparkles,
  Users,
  BadgeCheck,
  IdCard,
  ExternalLink,
  Pencil,
  Loader2,
  ArrowRight,
  FileSignature,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { ListingCover, PhotoPicker, uploadListingPhotos } from "@/components/listing-photos";
import { PricingBreakdown } from "@/components/pricing-breakdown";
import { PRICING_ITEM_KEYS } from "@/lib/pricing";
import {
  AvailabilityFields,
  DescriptionField,
  FeaturesFields,
  PropertyBasicsFields,
  emptyListingDetails,
} from "@/components/listing-detail-fields";
import {
  listingDetailPayload,
  validateListingDetails,
  HEATING_OPTIONS,
  usesFuelTank,
  fuelTankLabel,
  FAIR_FUEL_TITLE,
  FAIR_FUEL_POLICY,
  type HeatingOption,
  type ListingDetailInput,
} from "@/lib/listing-details";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Dashboard — RoostNI" },
      {
        name: "description",
        content: "Manage your RoostNI properties or your self-certified tenant passport.",
      },
    ],
  }),
  component: Dashboard,
});

type Tab = "properties" | "add";

interface Listing {
  id: string;
  title: string;
  address: string;
  location: string | null;
  monthly_rent: number;
  heating_type: string;
  is_published: boolean;
  created_at: string;
  photo_urls: string[] | null;
  occupancy_status: string;
  existing_tenant_name: string | null;
  existing_tenancy_start: string | null;
  ni_landlord_reg_number: string | null;
}

/** LRN not yet supplied (quick-add saves "Pending"). */
function lrnPending(v: string | null | undefined) {
  const s = (v ?? "").trim();
  return !s || s.toLowerCase() === "pending";
}

const TENANT_PREFS = [
  { label: "No pets", hint: "Pets not permitted on the property" },
  { label: "Non-smokers", hint: "Indoors and shared areas" },
  { label: "Professionals only", hint: "Stable income evidence required" },
  { label: "Students considered", hint: "With UK-based guarantor" },
  { label: "Couples welcome", hint: "Joint tenancy agreements" },
  { label: "Long-term tenancy", hint: "12 months or more preferred" },
];

function Dashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("properties");
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [applicationsCount, setApplicationsCount] = useState<number | undefined>(undefined);
  const [executedByListing, setExecutedByListing] = useState<Record<string, string>>({});

  const isLandlord = profile?.account_type === "landlord";

  const loadListings = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("property_listings")
      .select(
        "id, title, address, location, monthly_rent, heating_type, is_published, created_at, photo_urls, occupancy_status, existing_tenant_name, existing_tenancy_start, ni_landlord_reg_number",
      )
      .eq("landlord_id", user.id)
      .order("created_at", { ascending: false });
    const rows = (data as Listing[] | null) ?? [];
    setListings(rows);
    if (rows.length) {
      const ids = rows.map((r) => r.id);
      const { data: shares } = await supabase
        .from("passport_shares")
        .select("id, listing_id, lease_status")
        .in("listing_id", ids)
        .eq("lease_status", "counter_signed");
      const map: Record<string, string> = {};
      ((shares as { id: string; listing_id: string }[] | null) ?? []).forEach((s) => {
        if (!map[s.listing_id]) map[s.listing_id] = s.id;
      });
      setExecutedByListing(map);
    } else {
      setExecutedByListing({});
    }
    setLoading((prev) => (prev ? false : prev));
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    loadListings();
    if (isLandlord) {
      supabase
        .from("passport_shares")
        .select("id", { count: "exact", head: true })
        .then(({ count }) => setApplicationsCount(count ?? 0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isLandlord, authLoading]);

  if (authLoading) {
    return (
      <DashboardShell user={user} profile={profile} activeKey={tab}>
        <div className="rounded-3xl border border-border bg-surface p-10 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          <p className="mt-2">Checking your session…</p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      user={user}
      profile={profile}
      activeKey={tab}
      listingsCount={listings.length}
      applicationsCount={applicationsCount}
      onSelectTab={(key) => setTab(key)}
    >
      {!isLandlord ? (
        <TenantDashboard />
      ) : tab === "properties" ? (
        <MyProperties
          listings={listings}
          loading={loading}
          executedByListing={executedByListing}
          onAdd={() => setTab("add")}
          onRefresh={loadListings}
        />

      ) : (
        <AddPropertyForm
          onCancel={() => setTab("properties")}
          onCreated={async () => {
            await loadListings();
            setTab("properties");
          }}
        />
      )}
    </DashboardShell>
  );
}

function TenantDashboard() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [acceptedShares, setAcceptedShares] = useState<
    {
      id: string;
      lease_status: string | null;
      lease_signed_name: string | null;
      listing: { id: string; title: string; address: string; location: string | null } | null;
    }[]
  >([]);
  const [allShares, setAllShares] = useState<
    {
      id: string;
      status: string;
      shared_at: string;
      lease_status: string | null;
      lease_signed_name: string | null;
      tenancy_status: string | null;
      listing: { id: string; title: string; address: string; location: string | null; monthly_rent: number | null } | null;
    }[]
  >([]);
  const [passport, setPassport] = useState<{
    identity_verified: boolean;
    income_verified: boolean;
    reference_verified: boolean;
    employment_status: string | null;
    id_document_path: string | null;
    id_document_type: string | null;
    income_document_path: string | null;
    annual_income: number | null;
    previous_landlord_name: string | null;
    is_first_time_renter: boolean | null;
    guarantor_name: string | null;
  } | null>(null);
  const [applicationCounts, setApplicationCounts] = useState<{ sent: number; accepted: number; pending: number }>({
    sent: 0,
    accepted: 0,
    pending: 0,
  });
  const [busyShareId, setBusyShareId] = useState<string | null>(null);
  const [confirmWithdrawId, setConfirmWithdrawId] = useState<string | null>(null);

  const applyShareStatus = (id: string, status: string) => {
    setAllShares((rows) => {
      const next = rows.map((r) => (r.id === id ? { ...r, status } : r));
      setApplicationCounts({
        sent: next.length,
        accepted: next.filter((r) => r.status === "accepted").length,
        pending: next.filter(
          (r) => r.status !== "accepted" && r.status !== "rejected" && r.status !== "withdrawn",
        ).length,
      });
      return next;
    });
    setAcceptedShares((rows) => (status === "accepted" ? rows : rows.filter((r) => r.id !== id)));
  };

  const handleWithdraw = async (id: string) => {
    setBusyShareId(id);
    try {
      await withdrawApplication({ data: { shareId: id } });
      applyShareStatus(id, "withdrawn");
      setConfirmWithdrawId(null);
      toast.success("Application withdrawn", {
        description: "The landlord has been notified and can no longer see your passport.",
      });
    } catch (err) {
      toast.error("Couldn't withdraw", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusyShareId(null);
    }
  };

  const handleReapply = async (id: string) => {
    setBusyShareId(id);
    try {
      await reapplyApplication({ data: { shareId: id } });
      applyShareStatus(id, "pending");
      toast.success("Application re-sent");
    } catch (err) {
      toast.error("Couldn't re-apply", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusyShareId(null);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("tenant_passports")
          .select(
            "identity_verified, income_verified, reference_verified, employment_status, id_document_path, id_document_type, income_document_path, annual_income, previous_landlord_name, is_first_time_renter, guarantor_name",
          )
          .eq("user_id", user.id)
          .maybeSingle();
        if (cancelled) return;
        if (error) throw error;
        setPassport(data as typeof passport);
        setLoading(false);
        // Step A: fetch shares with NO embed so counts can never be blocked
        // by a join/RLS issue on property_listings.
        const { data: sharesRaw, error: sharesErr } = await supabase
          .from("passport_shares")
          .select("id, status, shared_at, listing_id, lease_status, lease_signed_name, tenancy_status")
          .eq("tenant_id", user.id)
          .order("shared_at", { ascending: false });
        if (cancelled) return;
        if (sharesErr) {
          toast.error("Couldn't load applications", {
            description: sharesErr.code ? `[${sharesErr.code}] ${sharesErr.message}` : sharesErr.message,
          });
          return;
        }
        const shareRows = (sharesRaw as { id: string; status: string; shared_at: string; listing_id: string; lease_status: string | null; lease_signed_name: string | null; tenancy_status: string | null }[] | null) ?? [];
        // Counts depend ONLY on Step A — never on the listing join.
        setApplicationCounts({
          sent: shareRows.length,
          accepted: shareRows.filter((r) => r.status === "accepted").length,
          pending: shareRows.filter(
            (r) => r.status !== "accepted" && r.status !== "rejected" && r.status !== "withdrawn",
          ).length,
        });

        // Step B: hydrate listing details separately. Missing rows are tolerated.
        type ListingLite = { id: string; title: string; address: string; location: string | null; monthly_rent: number | null };
        const listingMap = new Map<string, ListingLite>();
        const ids = Array.from(new Set(shareRows.map((s) => s.listing_id).filter(Boolean)));
        if (ids.length > 0) {
          const { data: listings, error: listingsErr } = await supabase
            .from("property_listings")
            .select("id, title, address, location, monthly_rent")
            .in("id", ids);
          if (cancelled) return;
          if (listingsErr) {
            toast.error("Couldn't load listing details", {
              description: listingsErr.code ? `[${listingsErr.code}] ${listingsErr.message}` : listingsErr.message,
            });
          } else {
            for (const l of ((listings as ListingLite[] | null) ?? [])) {
              listingMap.set(l.id, l);
            }
          }
        }

        const merged = shareRows.map((s) => ({
          id: s.id,
          status: s.status,
          shared_at: s.shared_at,
          lease_status: s.lease_status,
          lease_signed_name: s.lease_signed_name,
          tenancy_status: s.tenancy_status,
          listing: listingMap.get(s.listing_id) ?? null,
        }));
        setAllShares(merged);
        setAcceptedShares(merged.filter((r) => r.status === "accepted"));
      } catch (err: unknown) {
        if (cancelled) return;
        const e = err as { code?: string; message?: string };
        const msg = e?.message || "Please refresh.";
        toast.error("Couldn't load passport", {
          description: e?.code ? `[${e.code}] ${msg}` : msg,
        });
        // keep loading=true so we don't blank existing data with a 0/100 default
      }
    };
    load();
    const onFocus = () => {
      if (document.visibilityState === "visible") load();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  const handleSwitchAccount = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const steps = [
    {
      key: "identity",
      done:
        !!passport?.identity_verified ||
        (!!passport?.id_document_path && !!passport?.id_document_type),
    },
    {
      key: "income",
      done:
        !!passport?.income_verified ||
        (!!passport?.employment_status &&
          !!passport?.annual_income &&
          !!passport?.income_document_path),
    },
    {
      key: "references",
      done:
        !!passport?.reference_verified ||
        (passport?.is_first_time_renter
          ? !!passport?.guarantor_name
          : !!passport?.previous_landlord_name),
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const isComplete = doneCount === 3;
  const pct = Math.round((doneCount / 3) * 100);

  if (loading) {
    return (
      <div className="rounded-3xl border border-border bg-surface p-10 text-center text-sm text-muted-foreground shadow-floating">
        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
        <p className="mt-2">Loading your dashboard…</p>
      </div>
    );
  }

  const acceptedBanner = acceptedShares.length > 0 ? (
    <div className="mb-5 overflow-hidden rounded-3xl border border-verified/40 bg-verified-soft/70 p-6 shadow-floating sm:p-8">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-verified text-[var(--color-verified-foreground)]">
          <BadgeCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-verified">
            Application accepted
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold tracking-tight sm:text-2xl">
            {acceptedShares.length === 1
              ? "Congratulations — your application was accepted"
              : `${acceptedShares.length} of your applications were accepted`}
          </h2>
          <ul className="mt-3 space-y-2">
            {acceptedShares.map((s) => (
              <li key={s.id} className="rounded-2xl border border-verified/30 bg-surface/80 p-3.5">
                <p className="font-display text-sm font-semibold tracking-tight text-foreground">
                  {s.listing?.title ?? "Your accepted property"}
                </p>
                {s.listing?.address ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {s.listing.address}{s.listing.location ? ` · ${s.listing.location}` : ""}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {s.lease_status === "counter_signed" ? (
                    <>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-verified px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-verified-foreground)]">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        Lease fully signed — tenancy confirmed
                      </span>
                      <Link
                        to="/tenant/tenancy"
                        search={{ share: s.id }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-2 text-xs font-semibold text-background shadow-sm transition hover:brightness-110"
                      >
                        Open tenancy workspace
                      </Link>
                    </>
                  ) : s.lease_status === "sent_to_tenant" ? (
                    <Link
                      to="/tenant/review-lease"
                      search={{ share: s.id }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-2 text-xs font-semibold text-background shadow-sm transition hover:brightness-110"
                    >
                      <FileSignature className="h-3.5 w-3.5" />
                      Review &amp; Sign Lease
                    </Link>
                  ) : s.lease_status === "signed_pending_landlord" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-verified px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-verified-foreground)]">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      Lease Signed — Awaiting Landlord Counter-Signature
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <FileSignature className="h-3.5 w-3.5" />
                      Awaiting lease from landlord
                    </span>
                  )}
                  {s.listing?.id ? (
                    <Link
                      to="/listings/$id"
                      params={{ id: s.listing.id }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-foreground underline-offset-2 hover:underline"
                    >
                      View listing
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-foreground/80">
            {acceptedShares.some((s) => s.lease_status === "counter_signed")
              ? "Your tenancy is fully signed. Welcome home — your landlord will be in touch with move-in details."
              : acceptedShares.some((s) => s.lease_status === "signed_pending_landlord")
              ? "You've signed the lease. We'll notify you the moment your landlord counter-signs."
              : acceptedShares.some((s) => s.lease_status === "sent_to_tenant")
              ? "Your landlord has issued a lease. Review and sign it above to secure the tenancy."
              : "Your landlord will issue the lease shortly. You'll see a Review & Sign button here when it's ready."}
          </p>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {acceptedBanner}

      <div className="rounded-3xl border border-border bg-surface p-6 shadow-floating sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Dashboard overview
        </p>
        <h2 className="mt-1 font-display text-xl font-semibold tracking-tight sm:text-2xl">
          Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Here's a snapshot of your tenant activity on RoostNI.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-surface-muted px-2.5 py-1 text-muted-foreground">
            <span className="font-medium text-foreground/80">Signed in as</span>
            <span className="truncate font-mono text-[11px] text-foreground">{user?.email}</span>
          </span>
          <button
            type="button"
            onClick={handleSwitchAccount}
            className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-foreground transition hover:bg-secondary"
          >
            Not you? Switch account
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            label="Passport complete"
            value={isComplete ? "100%" : `${pct}%`}
            sub={isComplete ? "Self-certified" : `${doneCount} of 3 steps`}
            tone={isComplete ? "verified" : "muted"}
            icon={BadgeCheck}
          />
          <StatCard
            label="Applications sent"
            value={String(applicationCounts.sent)}
            sub={`${applicationCounts.pending} awaiting reply`}
            tone="muted"
            icon={Building2}
            href="#applications"
          />
          <StatCard
            label="Accepted"
            value={String(applicationCounts.accepted)}
            sub={applicationCounts.accepted > 0 ? "Lease pending" : "Keep applying"}
            tone={applicationCounts.accepted > 0 ? "verified" : "muted"}
            icon={Check}
            href="#applications"
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() =>
            navigate({ to: isComplete ? "/dashboard/passport" : "/dashboard/passport/edit" })
          }
          className="group flex items-start gap-3 rounded-3xl border border-border bg-surface p-5 text-left transition hover:border-foreground/30"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-verified-soft text-verified">
            <IdCard className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-semibold tracking-tight">
              {isComplete ? "View my passport" : "Build my passport"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isComplete
                ? "Identity, income & references — ready to share."
                : "Add identity, income & references to start applying."}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
        </button>

        <Link
          to="/listings"
          className="group flex items-start gap-3 rounded-3xl border border-border bg-surface p-5 text-left transition hover:border-foreground/30"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-surface-muted text-foreground">
            <Building2 className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-semibold tracking-tight">
              Browse properties
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Live NI listings — apply with one click using your passport.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
        </Link>
      </div>

      {!isComplete ? (
        <div className="mt-5 rounded-3xl border border-border bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Passport progress
              </p>
              <p className="mt-1 font-display text-base font-semibold tracking-tight">
                {doneCount} of 3 steps complete
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate({ to: "/dashboard/passport/edit" })}
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-2 text-xs font-medium text-[var(--color-primary-foreground)] transition hover:bg-foreground/92"
            >
              {doneCount === 0 ? "Start now" : "Continue"}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-verified transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ) : null}

      <div id="applications" className="mt-5 rounded-3xl border border-border bg-surface p-6 shadow-floating sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Your applications
            </p>
            <h3 className="mt-1 font-display text-lg font-semibold tracking-tight sm:text-xl">
              {allShares.length === 0
                ? "No applications yet"
                : `${allShares.length} application${allShares.length === 1 ? "" : "s"} sent`}
            </h3>
          </div>
          <Link
            to="/listings"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-medium text-foreground transition hover:bg-secondary"
          >
            Browse properties
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {allShares.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border bg-surface-muted/40 p-5">
            <p className="text-sm text-foreground">
              No applications on <span className="font-mono text-[12px]">{user?.email}</span> yet.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              If you've applied before and don't see it here, you may be signed in to a different account
              (check the email above for typos like <span className="font-mono">mail.com</span> vs <span className="font-mono">gmail.com</span>).
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                to="/listings"
                className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-[11px] font-semibold text-[var(--color-primary-foreground)] transition hover:bg-foreground/90"
              >
                Browse properties
                <ArrowRight className="h-3 w-3" />
              </Link>
              <button
                type="button"
                onClick={handleSwitchAccount}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-medium text-foreground transition hover:bg-secondary"
              >
                Switch account
              </button>
            </div>
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {allShares.map((s) => {
              const tone =
                s.status === "accepted"
                  ? "bg-verified text-[var(--color-verified-foreground)]"
                  : s.status === "rejected"
                  ? "bg-rose-100 text-rose-700"
                  : s.status === "withdrawn"
                  ? "bg-surface-muted text-muted-foreground"
                  : "bg-secondary text-foreground";
              const label =
                s.status === "accepted"
                  ? "Accepted"
                  : s.status === "rejected"
                  ? "Not selected"
                  : s.status === "withdrawn"
                  ? "Withdrawn"
                  : "Awaiting reply";
              const leaseLabel =
                s.lease_status === "counter_signed"
                  ? "Lease fully signed"
                  : s.lease_status === "signed_pending_landlord"
                  ? "Awaiting landlord counter-sign"
                  : s.lease_status === "sent_to_tenant"
                  ? "Lease ready to sign"
                  : null;
              const endLabel =
                s.tenancy_status === "completed"
                  ? "Tenancy closed"
                  : s.tenancy_status === "ended"
                  ? "Tenancy ended · action needed"
                  : s.tenancy_status === "ending"
                  ? "Notice served · ending"
                  : null;
              return (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface-muted/50 p-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-semibold tracking-tight text-foreground">
                      {s.listing?.title ?? "Listing unavailable"}
                    </p>
                    {s.listing?.address ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {s.listing.address}
                        {s.listing.location ? ` · ${s.listing.location}` : ""}
                        {s.listing.monthly_rent ? ` · £${Number(s.listing.monthly_rent).toLocaleString()}/mo` : ""}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tone}`}>
                      {label}
                    </span>
                    {leaseLabel ? (
                      <span className="inline-flex items-center rounded-full bg-verified-soft px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-verified">
                        {leaseLabel}
                      </span>
                    ) : null}
                    {endLabel ? (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                        {endLabel}
                      </span>
                    ) : null}
                    {s.tenancy_status === "ending" || s.tenancy_status === "ended" ? (
                      <Link
                        to="/tenant/tenancy"
                        search={{ share: s.id }}
                        className="inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[11px] font-semibold text-background transition hover:brightness-110"
                      >
                        Open tenancy
                      </Link>
                    ) : null}
                    {s.lease_status === "sent_to_tenant" ? (
                      <Link
                        to="/tenant/review-lease"
                        search={{ share: s.id }}
                        className="inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[11px] font-semibold text-background transition hover:brightness-110"
                      >
                        <FileSignature className="h-3 w-3" />
                        Sign
                      </Link>
                    ) : null}
                    {s.listing?.id ? (
                      <Link
                        to="/listings/$id"
                        params={{ id: s.listing.id }}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-foreground transition hover:bg-secondary"
                      >
                        View
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : null}
                    {s.status === "withdrawn" ? (
                      <button
                        type="button"
                        onClick={() => handleReapply(s.id)}
                        disabled={busyShareId === s.id}
                        className="inline-flex items-center gap-1 rounded-full bg-verified px-2.5 py-1 text-[11px] font-semibold text-[var(--color-verified-foreground)] transition hover:brightness-95 disabled:opacity-60"
                      >
                        {busyShareId === s.id ? "Sending…" : "Apply again"}
                      </button>
                    ) : !s.lease_status && !s.tenancy_status && s.status !== "rejected" ? (
                      confirmWithdrawId === s.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleWithdraw(s.id)}
                            disabled={busyShareId === s.id}
                            className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                          >
                            {busyShareId === s.id ? "Withdrawing…" : "Confirm withdraw"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmWithdrawId(null)}
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium transition hover:bg-secondary"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmWithdrawId(s.id)}
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                        >
                          Withdraw
                        </button>
                      )
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <PastTenanciesSection shares={allShares} userEmail={user?.email} />
    </>
  );
}

function PastTenanciesSection({
  shares,
  userEmail,
}: {
  shares: {
    id: string;
    status: string;
    lease_status: string | null;
    tenancy_status: string | null;
    listing: { id: string; title: string; address: string; location: string | null; monthly_rent: number | null } | null;
  }[];
  userEmail?: string;
}) {
  const past = shares.filter(
    (s) => s.tenancy_status === "completed" || s.tenancy_status === "ended",
  );
  if (past.length === 0) return null;

  return (
    <div className="mt-5 rounded-3xl border border-border bg-surface p-6 shadow-resting sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Tenancy history
          </p>
          <h3 className="mt-1 font-display text-lg font-semibold tracking-tight sm:text-xl">
            {past.length} past tenancy{past.length === 1 ? "" : "ies"}
          </h3>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {past.map((s) => {
          const closed = s.tenancy_status === "completed";
          return (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface-muted/50 p-3.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-semibold tracking-tight text-foreground">
                  {s.listing?.title ?? "Listing unavailable"}
                </p>
                {s.listing?.address ? (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {s.listing.address}
                    {s.listing.location ? ` · ${s.listing.location}` : ""}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    closed
                      ? "bg-surface-muted text-muted-foreground"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {closed ? "Closed" : "Ended · action needed"}
                </span>
                <Link
                  to="/tenant/tenancy"
                  search={{ share: s.id }}
                  className="inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[11px] font-semibold text-background transition hover:brightness-110"
                >
                  Open tenancy
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone,
  icon: Icon,
  href,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "verified" | "muted";
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
}) {
  const Wrapper: React.ElementType = href ? "a" : "div";
  const wrapperProps = href
    ? {
        href,
        className:
          "block rounded-2xl border border-border bg-surface-muted/60 p-4 transition hover:border-foreground/30 hover:bg-surface-muted",
      }
    : { className: "rounded-2xl border border-border bg-surface-muted/60 p-4" };
  return (
    <Wrapper {...wrapperProps}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <span
          className={`grid h-6 w-6 place-items-center rounded-full ${
            tone === "verified"
              ? "bg-verified text-[var(--color-verified-foreground)]"
              : "bg-surface text-muted-foreground"
          }`}
        >
          <Icon className="h-3 w-3" />
        </span>
      </div>
      <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
    </Wrapper>
  );
}

const AUDIT_DONE_KEY = "roostni_audit_last";

function LandlordOnboarding({ listings, onAdd }: { listings: Listing[]; onAdd: () => void }) {
  const [audit, setAudit] = useState<{ score: number; band: string } | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(AUDIT_DONE_KEY);
      if (raw) setAudit(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  // Value first: add → share → compliance check.
  const first = listings.find((l) => l.is_published) ?? listings[0];
  const stepDone = [listings.length > 0, listings.some((l) => l.is_published), !!audit];
  const doneCount = stepDone.filter(Boolean).length;
  if (doneCount === 3) return null;
  const link = first ? `https://roostni.co.uk/listings/${first.id}` : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — press and hold the link instead");
    }
  };

  const btn =
    "group inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 active:translate-y-0";

  const Step = ({
    n,
    title,
    body,
    done,
    locked,
    children,
  }: {
    n: number;
    title: string;
    body: string;
    done: boolean;
    locked?: boolean;
    children?: React.ReactNode;
  }) => (
    <li
      className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
        done ? "border-verified/30 bg-verified-soft/40" : "border-border bg-surface"
      } ${locked ? "opacity-60" : ""}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${
            done
              ? "bg-verified text-[var(--color-verified-foreground)]"
              : "bg-surface-muted text-foreground"
          }`}
        >
          {done ? <Check className="h-4 w-4" strokeWidth={3} /> : n}
        </span>
        <div className="min-w-0">
          <p className="font-display text-sm font-semibold tracking-tight">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{body}</p>
        </div>
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </li>
  );

  return (
    <div className="mb-6 rounded-3xl border border-border bg-surface p-5 shadow-floating sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-verified">
            Getting started
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold tracking-tight sm:text-2xl">
            Get Your First NI Property Live
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Free during Public Beta • No agent fees or commissions
          </p>
        </div>
        <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold">
          {doneCount} of 3 done
        </span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-muted" aria-hidden>
        <div
          className="h-full rounded-full bg-verified transition-all duration-500"
          style={{ width: `${(doneCount / 3) * 100}%` }}
        />
      </div>
      <ol className="mt-5 space-y-3">
        <Step
          n={1}
          title="Add Your First Rental Property"
          body="Just address, postcode, rent and deposit — about 30 seconds. Deposits are capped at one month's rent under the Private Tenancies Act (NI) 2022; we check this for you."
          done={stepDone[0]}
        >
          {!stepDone[0] ? (
            <button
              type="button"
              onClick={onAdd}
              className={`${btn} bg-verified text-[var(--color-verified-foreground)] shadow-raised hover:shadow-floating`}
            >
              <Plus className="h-4 w-4" />
              Add property
            </button>
          ) : null}
        </Step>
        <Step
          n={2}
          title="Share Your Direct Listing Link"
          body={
            first
              ? first.is_published
                ? "Send this link to WhatsApp, Facebook or anyone looking."
                : "Your property is saved privately. Choose “Advertise” on it below to make this link live for tenants."
              : "Unlocks as soon as you've added a property."
          }
          done={stepDone[1]}
          locked={!first}
        >
          {first && first.is_published ? (
            <div className="flex flex-wrap items-center gap-2">
              <code className="max-w-[220px] truncate rounded-lg bg-surface-muted px-2.5 py-1.5 text-xs">
                roostni.co.uk/listings/{first.id.slice(0, 8)}…
              </code>
              <button
                type="button"
                onClick={copy}
                className={`${btn} border border-border bg-surface text-foreground`}
              >
                {copied ? <Check className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
                {copied ? "Copied" : "Copy link"}
              </button>
              <Link
                to="/listings/$id"
                params={{ id: first.id }}
                className="text-xs font-medium text-foreground underline-offset-2 hover:underline"
              >
                Preview
              </Link>
            </div>
          ) : null}
        </Step>
        <Step
          n={3}
          title="Run Tenancy Compliance Check & Certificates"
          body={
            audit
              ? `Last score: ${audit.score}% — ${audit.band}`
              : "Five quick questions on registration, deposits, notices and safety — then log your EPC, gas and electrical certificates."
          }
          done={stepDone[2]}
        >
          <Link
            to="/audit"
            className={`${btn} ${audit ? "border border-border bg-surface text-foreground" : "bg-foreground text-background shadow-raised hover:shadow-floating"}`}
          >
            {audit ? "Retake check" : "Start check"}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </Link>
        </Step>
      </ol>
    </div>
  );
}

function MyProperties({
  listings,
  loading,
  executedByListing,
  onAdd,
  onRefresh,
}: {
  listings: Listing[];
  loading: boolean;
  executedByListing: Record<string, string>;
  onAdd: () => void;
  onRefresh: () => Promise<void> | void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const notifyPublished = useServerFn(notifyListingPublished);

  const setStatus = async (
    l: Listing,
    patch: Record<string, unknown>,
    message: string,
    description: string,
  ) => {
    setBusyId(l.id);
    const { error } = await supabase
      .from("property_listings")
      .update(patch as never)
      .eq("id", l.id);
    setBusyId(null);
    if (error) {
      toast.error("Could not update this property", { description: error.message });
      return;
    }
    toast.success(message, { description });
    if (patch.is_published === true) {
      void notifyPublished({ data: { listingId: l.id } }).catch(() => {});
    }
    await onRefresh();
  };

  return (
    <div>
      {!loading ? <LandlordOnboarding listings={listings} onAdd={onAdd} /> : null}
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            My properties
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold tracking-tight sm:text-2xl">
            Active listings
          </h2>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-2 text-xs font-medium text-[var(--color-primary-foreground)] transition hover:bg-foreground/92 sm:text-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          Add new
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-muted-foreground">
          Loading listings…
        </div>
      ) : listings.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface p-5 text-center text-sm text-muted-foreground">
          Your properties will appear here once you add the first one.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border bg-surface shadow-floating">
          {listings.map((l, i) => (
            <li
              key={l.id}
              className={`p-4 transition hover:bg-surface-muted/60 sm:p-5 ${
                i > 0 ? "border-t border-border" : ""
              }`}
            >
              <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                <Link
                  to="/listings/$id"
                  params={{ id: l.id }}
                  className="group h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border sm:h-20 sm:w-28"
                  aria-label={`View photos for ${l.title}`}
                  tabIndex={-1}
                >
                  <ListingCover
                    paths={l.photo_urls}
                    alt={l.title}
                    className="h-full w-full"
                    showCount={false}
                  />
                </Link>

                <div className="min-w-0 flex-1">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                    <Link
                      to="/listings/$id"
                      params={{ id: l.id }}
                      className="min-w-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
                      aria-label={`View ${l.title}`}
                    >
                      <p className="truncate font-display text-base font-semibold tracking-tight">
                        {l.title}
                      </p>
                      <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {l.address}
                          {l.location ? ` · ${l.location}` : null}
                        </span>
                      </p>
                      <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                        <Flame className="h-3 w-3 shrink-0" />
                        <span className="truncate">{l.heating_type}</span>
                      </p>
                    </Link>

                    <div className="flex shrink-0 flex-col items-end gap-1.5 text-right">
                      <p className="whitespace-nowrap font-display text-base font-semibold tracking-tight">
                        £{Number(l.monthly_rent).toLocaleString()}
                        <span className="ml-1 text-[11px] font-medium text-muted-foreground">
                          pcm
                        </span>
                      </p>
                      {executedByListing[l.id] ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#1d4ed8] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                          <BadgeCheck className="h-3 w-3 shrink-0" />
                          Let Agreed
                        </span>
                      ) : l.occupancy_status === "tenanted" ? (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[#1d4ed8]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#1d4ed8]">
                          <Building2 className="h-3 w-3 shrink-0" />
                          Tenanted · off market
                        </span>
                      ) : l.is_published ? (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-verified-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-verified">
                          <ShieldCheck className="h-3 w-3 shrink-0" />
                          Live · advertising
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Vacant · not advertised
                        </span>
                      )}
                      {l.occupancy_status === "tenanted" && l.existing_tenant_name ? (
                        <span className="text-[11px] text-muted-foreground">
                          {l.existing_tenant_name}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:justify-end">
                {executedByListing[l.id] ? (
                  <Link
                    to="/landlord/manage-tenancy"
                    search={{ share: executedByListing[l.id] }}
                    className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-[11px] font-medium text-[var(--color-primary-foreground)] transition hover:bg-foreground/92"
                  >
                    <FileSignature className="h-3 w-3 shrink-0" />
                    Manage Tenancy
                  </Link>
                ) : l.occupancy_status === "tenanted" ? (
                  <>
                    <Link
                      to="/dashboard/listing-edit"
                      search={{ id: l.id }}
                      className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-[11px] font-medium text-[var(--color-primary-foreground)] transition hover:bg-foreground/92"
                    >
                      <ShieldCheck className="h-3 w-3 shrink-0" />
                      Records & certificates
                    </Link>
                    <button
                      type="button"
                      disabled={busyId === l.id}
                      onClick={() =>
                        void setStatus(
                          l,
                          { occupancy_status: "vacant", tenancy_ended_at: new Date().toISOString() },
                          "Marked as vacant",
                          "You can advertise it on RoostNI whenever you're ready.",
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-medium text-foreground transition hover:bg-secondary disabled:opacity-60"
                    >
                      Tenancy ended
                    </button>
                  </>
                ) : l.is_published ? (
                  <>
                    <Link
                      to="/dashboard/applications"
                      search={{ listing: l.id }}
                      className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-[11px] font-medium text-[var(--color-primary-foreground)] transition hover:bg-foreground/92"
                    >
                      <Users className="h-3 w-3 shrink-0" />
                      View applicants
                    </Link>
                    <Link
                      to="/listings/$id"
                      params={{ id: l.id }}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-medium text-foreground transition hover:bg-secondary"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      View listing
                    </Link>
                    <button
                      type="button"
                      disabled={busyId === l.id}
                      onClick={() =>
                        void setStatus(
                          l,
                          { is_published: false },
                          "Taken off the market",
                          "It's hidden from the public listings but kept in your account.",
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-medium text-foreground transition hover:bg-secondary disabled:opacity-60"
                    >
                      Take off market
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={busyId === l.id}
                    onClick={() =>
                      void setStatus(
                        l,
                        { is_published: true, occupancy_status: "vacant" },
                        "Now advertising on RoostNI",
                        "Tenants can view it and apply with their RoostNI passport.",
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-[11px] font-medium text-[var(--color-primary-foreground)] transition hover:bg-foreground/92 disabled:opacity-60"
                  >
                    <Sparkles className="h-3 w-3 shrink-0" />
                    Advertise on RoostNI
                  </button>
                )}

                <Link
                  to="/dashboard/listing-edit"
                  search={{ id: l.id }}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-medium text-foreground transition hover:bg-secondary"
                >
                  <Pencil className="h-3 w-3 shrink-0" />
                  Edit
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddPropertyForm({ onCreated }: { onCreated: () => Promise<void> | void }) {
  const { user } = useAuth();
  const notifyPublished = useServerFn(notifyListingPublished);
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState("");
  const [rent, setRent] = useState("");
  const [deposit, setDeposit] = useState("");
  const [postcode, setPostcode] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [heating, setHeating] = useState<HeatingOption>("Oil");
  const [heatingOpen, setHeatingOpen] = useState(false);
  const [fuelPolicy, setFuelPolicy] = useState(true);
  const [prefs, setPrefs] = useState<string[]>(["No pets", "Non-smokers"]);
  const [submitting, setSubmitting] = useState<false | "private" | "publish">(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [details, setDetails] = useState<ListingDetailInput>(emptyListingDetails);
  const [occupancy, setOccupancy] = useState<"tenanted" | "vacant">("tenanted");
  const [tenantName, setTenantName] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [tenancyStart, setTenancyStart] = useState("");
  const [depositScheme, setDepositScheme] = useState("");
  const [depositRef, setDepositRef] = useState("");

  const isTenanted = occupancy === "tenanted";

  const togglePref = (label: string) =>
    setPrefs((s) => (s.includes(label) ? s.filter((x) => x !== label) : [...s, label]));

  const save = async (mode: "private" | "publish") => {
    if (!user || submitting) return;
    const detailError = validateListingDetails(details);
    if (detailError) {
      toast.error("Check the property details", { description: detailError });
      return;
    }
    const rentNum = Number(rent);
    const depositNum = Number(deposit);
    if (rentNum > 0 && depositNum > rentNum) {
      toast.error("Deposit is above one month's rent", {
        description:
          "Under the Private Tenancies Act (NI) 2022 a deposit cannot exceed one month's rent. Please lower it to £" +
          rentNum.toLocaleString() +
          " or less.",
      });
      return;
    }
    if (isTenanted && !tenantName.trim()) {
      toast.error("Add the current tenant's name", {
        description: "It keeps your rent records and receipts clear.",
      });
      return;
    }
    setSubmitting(mode);
    try {
      let photoPaths: string[] = [];
      if (photos.length > 0) {
        try {
          photoPaths = await uploadListingPhotos(user.id, photos);
        } catch {
          toast.error("Photos could not be uploaded", {
            description: "The property was not saved. Please try again.",
          });
          setSubmitting(false);
          return;
        }
      }
      const { data: created, error } = await supabase
        .from("property_listings")
        .insert({
          landlord_id: user.id,
          title,
          address,
          location: [location, postcode].filter(Boolean).join(" · ") || null,
          monthly_rent: Number(rent),
          deposit: Number(deposit),
          ni_landlord_reg_number: regNumber,
          heating_type: heating,
          enforce_empty_in_full_out: usesFuelTank(heating) ? fuelPolicy : false,
          tenant_preferences: prefs,
          is_published: !isTenanted && mode === "publish",
          occupancy_status: occupancy,
          existing_tenant_name: isTenanted ? tenantName.trim() : null,
          existing_tenant_email: isTenanted && tenantEmail.trim() ? tenantEmail.trim() : null,
          existing_tenancy_start: isTenanted && tenancyStart ? tenancyStart : null,
          existing_deposit_scheme: isTenanted && depositScheme ? depositScheme : null,
          existing_deposit_reference: isTenanted && depositRef.trim() ? depositRef.trim() : null,
          photo_urls: photoPaths,
          ...listingDetailPayload(details),
        } as never)
        .select("id")
        .single();
      if (error) throw error;
      if (!isTenanted && mode === "publish" && created) {
        const newId = (created as { id: string }).id;
        void notifyPublished({ data: { listingId: newId } }).catch(() => {});
      }
      toast.success(
        isTenanted
          ? "Property saved privately"
          : mode === "publish"
            ? "Now advertising on RoostNI"
            : "Property saved as vacant",
        {
          description: isTenanted
            ? "It is never shown publicly. Add your safety certificates and rent records any time."
            : mode === "publish"
              ? "Tenants can view it and apply with their RoostNI passport."
              : "Advertise it on RoostNI whenever you're ready.",
        },
      );
      setTitle("");
      setAddress("");
      setLocation("");
      setPostcode("");
      setRent("");
      setDeposit("");
      setRegNumber("");
      setPhotos([]);
      setDetails(emptyListingDetails);
      setTenantName("");
      setTenantEmail("");
      setTenancyStart("");
      setDepositScheme("");
      setDepositRef("");
      await onCreated();
    } catch (err: unknown) {
      toast.error("Could not save property", {
        description: err instanceof Error ? err.message : "Please try again",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void save(isTenanted ? "private" : "publish");
  };

  const inputCx =
    "mt-1.5 block h-11 w-full rounded-xl border border-border bg-surface shadow-resting px-3.5 text-sm text-foreground placeholder:text-muted-foreground/80 transition focus:border-verified/40 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-verified/20";

  return (
    <form onSubmit={onSubmit}>
      <div className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          New property
        </p>
        <h2 className="mt-1 font-display text-xl font-semibold tracking-tight sm:text-2xl">
          Add a property to RoostNI
        </h2>
      </div>

      <FormCard eyebrow="Step 01" title="Is the property occupied?">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {(
            [
              {
                key: "tenanted" as const,
                label: "Currently tenanted",
                hint: "Keep your certificates, rent records and deadlines in order. Never shown publicly.",
              },
              {
                key: "vacant" as const,
                label: "Vacant",
                hint: "Empty or between tenancies. You choose when to advertise it on RoostNI.",
              },
            ]
          ).map((opt) => {
            const active = occupancy === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setOccupancy(opt.key)}
                aria-pressed={active}
                className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition ${
                  active
                    ? "border-foreground/20 bg-surface shadow-raised"
                    : "border-border bg-surface-muted hover:bg-secondary"
                }`}
              >
                <span
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition ${
                    active
                      ? "border-verified bg-verified text-[var(--color-verified-foreground)]"
                      : "border-border bg-surface"
                  }`}
                >
                  {active ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{opt.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{opt.hint}</span>
                </span>
              </button>
            );
          })}
        </div>

        {isTenanted ? (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Current tenant's name" className="sm:col-span-2">
              <input
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                placeholder="Sarah McKee"
                className={inputCx}
              />
            </Field>
            <Field label="Tenant email (optional)" hint="Used only for rent receipts you choose to send.">
              <input
                type="email"
                value={tenantEmail}
                onChange={(e) => setTenantEmail(e.target.value)}
                placeholder="sarah@example.com"
                className={inputCx}
              />
            </Field>
            <Field label="Tenancy start date">
              <input
                type="date"
                value={tenancyStart}
                onChange={(e) => setTenancyStart(e.target.value)}
                className={inputCx}
              />
            </Field>
            <Field label="Deposit scheme">
              <select
                value={depositScheme}
                onChange={(e) => setDepositScheme(e.target.value)}
                className={inputCx}
              >
                <option value="">Not recorded yet</option>
                <option value="TDS Northern Ireland">TDS Northern Ireland</option>
                <option value="MyDeposits Northern Ireland">MyDeposits Northern Ireland</option>
              </select>
            </Field>
            <Field label="Deposit reference (optional)">
              <input
                value={depositRef}
                onChange={(e) => setDepositRef(e.target.value)}
                placeholder="Scheme certificate number"
                className={inputCx}
              />
            </Field>
            <div className="sm:col-span-2 flex items-start gap-2 rounded-xl bg-surface-muted px-3 py-2.5 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              This property stays private to you. When the tenancy ends, you can advertise it on
              RoostNI with one tap.
            </div>
          </div>
        ) : null}
      </FormCard>

      <FormCard eyebrow="Step 02" title="Basic info">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Property title" className="sm:col-span-2">
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bright 2-bed terrace near Ormeau Park"
              className={inputCx}
            />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="42 Ravenhill Avenue, Belfast"
                className={`${inputCx} pl-9`}
              />
            </div>
          </Field>
          <Field label="Town / area">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ormeau, Belfast"
              className={inputCx}
            />
          </Field>
          <Field label="Postcode">
            <input
              required
              value={postcode}
              onChange={(e) => setPostcode(e.target.value.toUpperCase())}
              placeholder="BT6 8DA"
              className={`${inputCx} uppercase tracking-wider`}
            />
          </Field>
          <Field label="Monthly rent">
            <div className="relative">
              <PoundSterling className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                required
                inputMode="numeric"
                value={rent}
                onChange={(e) => setRent(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="895"
                className={`${inputCx} pl-9`}
              />
            </div>
          </Field>
          <Field label="Security deposit">
            <div className="relative">
              <PoundSterling className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                required
                inputMode="numeric"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="895"
                className={`${inputCx} pl-9`}
              />
            </div>
          </Field>
        </div>
      </FormCard>

      <FormCard eyebrow="Step 03" title="Property basics">
        <PropertyBasicsFields value={details} onChange={setDetails} />
      </FormCard>

      <FormCard eyebrow="Step 04" title="Availability">
        <AvailabilityFields value={details} onChange={setDetails} />
      </FormCard>

      <FormCard eyebrow="Step 05" title="Description">
        <DescriptionField value={details} onChange={setDetails} />
      </FormCard>

      <FormCard eyebrow="Step 06" title="Features & running costs">
        <FeaturesFields value={details} onChange={setDetails} />
      </FormCard>

      <FormCard eyebrow="Step 07" title="Property photos">
        <PhotoPicker files={photos} onChange={setPhotos} />
      </FormCard>

      <FormCard eyebrow="Step 08" title="NI compliance verification">
        <Field
          label="Northern Ireland Landlord Registration Number"
          hint="Legally required for all private tenancies in Northern Ireland. Format: LRN-NI-XXXXXX."
        >
          <div className="relative">
            <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              required
              value={regNumber}
              onChange={(e) => setRegNumber(e.target.value.toUpperCase())}
              placeholder="LRN-NI-284119"
              className={`${inputCx} pl-9 uppercase tracking-wider`}
            />
          </div>
        </Field>
      </FormCard>

      <FormCard eyebrow="Step 09" title="Smart infrastructure">
        <Field label="Heating & utility type">
          <div className="relative mt-1.5">
            <button
              type="button"
              onClick={() => setHeatingOpen((o) => !o)}
              className="flex h-11 w-full items-center justify-between rounded-xl border border-border bg-surface shadow-resting px-3.5 text-left text-sm text-foreground transition focus:border-verified/40 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-verified/20"
              aria-haspopup="listbox"
              aria-expanded={heatingOpen}
            >
              <span className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-muted-foreground" />
                {heating}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition ${heatingOpen ? "rotate-180" : ""}`}
              />
            </button>
            {heatingOpen ? (
              <ul
                role="listbox"
                className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-floating"
              >
                {HEATING_OPTIONS.map((opt) => {
                  const active = opt === heating;
                  return (
                    <li key={opt}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => {
                          setHeating(opt);
                          setHeatingOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition ${
                          active
                            ? "bg-secondary text-foreground"
                            : "text-foreground/80 hover:bg-secondary"
                        }`}
                      >
                        <span>{opt}</span>
                        {active ? <Check className="h-4 w-4 text-verified" /> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </Field>

        {usesFuelTank(heating) ? (
          <div className="mt-5 overflow-hidden rounded-2xl border border-verified/30 bg-verified-soft/40">
            <div className="flex items-start gap-3 p-5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-verified text-[var(--color-verified-foreground)]">
                <Flame className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-verified">
                  Fair Fuel policy
                </p>
                <p className="mt-1 font-display text-base font-semibold tracking-tight text-foreground">
                  {FAIR_FUEL_TITLE}
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {fuelTankLabel(heating)}: {FAIR_FUEL_POLICY} The handover level you record at
                  move-in is the baseline, which keeps the deposit return clean and predictable.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFuelPolicy((v) => !v)}
              aria-pressed={fuelPolicy}
              className="flex w-full items-center justify-between gap-4 border-t border-verified/20 bg-surface/60 px-5 py-4 text-left transition hover:bg-surface"
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">
                  Enforce Fair Fuel policy
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Auto-matches your listing to tenants who already accept these terms.
                </span>
              </span>
              <span
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                  fuelPolicy ? "bg-verified" : "bg-border"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-surface shadow transition ${
                    fuelPolicy ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </span>
            </button>
          </div>
        ) : (
          <div className="mt-5 flex items-start gap-2 rounded-xl bg-surface-muted px-3 py-2.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Select <span className="font-medium text-foreground">Oil</span> or{" "}
            <span className="font-medium text-foreground">LPG</span> to enable RoostNI's Fair Fuel
            same-level-out tenancy clause.
          </div>
        )}
      </FormCard>

      <FormCard eyebrow="Step 10" title="Tenant requirements">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {TENANT_PREFS.map(({ label, hint }) => {
            const active = prefs.includes(label);
            return (
              <button
                key={label}
                type="button"
                onClick={() => togglePref(label)}
                aria-pressed={active}
                className={`group flex items-start gap-3 rounded-2xl border p-3.5 text-left transition ${
                  active
                    ? "border-foreground/20 bg-surface shadow-raised"
                    : "border-border bg-surface-muted hover:bg-secondary"
                }`}
              >
                <span
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition ${
                    active
                      ? "border-verified bg-verified text-[var(--color-verified-foreground)]"
                      : "border-border bg-surface"
                  }`}
                >
                  {active ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl bg-surface-muted px-3 py-2.5 text-xs text-muted-foreground">
          <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Preferences help applicants self-select. They do not filter or rank anyone — you will
            see every application that comes in.
          </span>
        </div>
      </FormCard>

      <PricingBreakdown
        className="mt-5"
        title="What this listing would cost"
        itemKeys={[PRICING_ITEM_KEYS.tenancyAgreement]}
      />

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        {!isTenanted ? (
          <button
            type="button"
            onClick={() => void save("private")}
            disabled={submitting !== false}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-surface px-6 py-3.5 font-display text-sm font-semibold text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {submitting === "private" ? "Saving…" : "Save without advertising"}
          </button>
        ) : null}
        <button
          type="submit"
          disabled={submitting !== false}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3.5 font-display text-base font-semibold text-[var(--color-primary-foreground)] shadow-raised transition hover:translate-y-[-1px] hover:bg-foreground/92 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          <Sparkles className="h-4 w-4" />
          {isTenanted
            ? submitting === "private"
              ? "Saving…"
              : "Save private property"
            : submitting === "publish"
              ? "Publishing…"
              : "Advertise on RoostNI"}
        </button>
      </div>
    </form>
  );
}

function FormCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5 rounded-3xl border border-border bg-surface p-5 shadow-floating sm:p-7">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {eyebrow}
      </p>
      <h3 className="mt-1 font-display text-lg font-semibold tracking-tight sm:text-xl">{title}</h3>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}