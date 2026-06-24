import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
  Banknote,
  UserRoundCheck,
  Pencil,
  Share2,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/dashboard-shell";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Roost NI" },
      {
        name: "description",
        content: "Manage your Roost NI properties or your verified tenant passport.",
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
}

const HEATING_OPTIONS = ["Oil", "Gas", "Electric"] as const;
type HeatingOption = (typeof HEATING_OPTIONS)[number];
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

  const isLandlord = profile?.account_type === "landlord";

  const loadListings = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("property_listings")
      .select("id, title, address, location, monthly_rent, heating_type, is_published, created_at")
      .eq("landlord_id", user.id)
      .order("created_at", { ascending: false });
    setListings((data as Listing[] | null) ?? []);
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
          onAdd={() => setTab("add")}
        />
      ) : (
        <AddPropertyForm
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
    { id: string; listing: { id: string; title: string; address: string; location: string | null } | null }[]
  >([]);
  const [passport, setPassport] = useState<{
    identity_verified: boolean;
    income_verified: boolean;
    reference_verified: boolean;
    right_to_rent_verified: boolean;
    employment_status: string | null;
    monthly_income_net: number | null;
    annual_income: number | null;
    id_document_type: string | null;
    id_document_path: string | null;
    income_document_path: string | null;
    previous_landlord_name: string | null;
    previous_landlord_email: string | null;
    previous_landlord_phone: string | null;
    tenancy_duration: string | null;
    reference_document_path: string | null;
    is_first_time_renter: boolean | null;
    guarantor_name: string | null;
    previous_landlord_name_2: string | null;
  } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("tenant_passports")
          .select(
            "identity_verified, income_verified, reference_verified, right_to_rent_verified, employment_status, monthly_income_net, annual_income, id_document_type, id_document_path, income_document_path, previous_landlord_name, previous_landlord_email, previous_landlord_phone, tenancy_duration, reference_document_path, is_first_time_renter, guarantor_name, previous_landlord_name_2",
          )
          .eq("user_id", user.id)
          .maybeSingle();
        if (cancelled) return;
        if (error) throw error;
        setPassport(data as typeof passport);
        setLoading(false);
        const { data: shares } = await supabase
          .from("passport_shares")
          .select("id, listing:property_listings!listing_id(id, title, address, location)")
          .eq("tenant_id", user.id)
          .eq("status", "accepted")
          .order("shared_at", { ascending: false });
        if (!cancelled) {
          setAcceptedShares(
            (shares as unknown as { id: string; listing: { id: string; title: string; address: string; location: string | null } | null }[] | null) ?? [],
          );
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const e = err as { code?: string; message?: string };
        const msg = e?.message || "Please refresh.";
        toast.error("Couldn't load passport", {
          description: e?.code ? `[${e.code}] ${msg}` : msg,
        });
        // keep loading=true so we don't blank existing data with a 0/100 default
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  const steps = [
    {
      key: "identity",
      label: "Identity & Right to Rent",
      icon: IdCard,
      // Treat the step as complete if the flag is set OR the underlying
      // fields are present — protects against historic rows where the
      // boolean flag was never written but the document + type exist.
      done:
        !!passport?.identity_verified ||
        (!!passport?.id_document_path && !!passport?.id_document_type),
    },
    {
      key: "income",
      label: "Income verification",
      icon: Banknote,
      done:
        !!passport?.income_verified ||
        (!!passport?.employment_status &&
          !!passport?.annual_income &&
          !!passport?.income_document_path),
    },
    {
      key: "references",
      label: "Character references",
      icon: UserRoundCheck,
      done:
        !!passport?.reference_verified ||
        (passport?.is_first_time_renter
          ? !!passport?.guarantor_name
          : !!passport?.previous_landlord_name),
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const isComplete = doneCount === 3;

  const shareLink = async () => {
    if (!user) return;
    const url = `${window.location.origin}/passport/${user.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Passport link copied", {
        description: "Share it with a landlord to instantly verify your badges.",
      });
    } catch {
      toast.error("Could not copy link", { description: url });
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-border bg-surface p-10 text-center text-sm text-muted-foreground shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_48px_-32px_rgba(15,23,42,0.18)]">
        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
        <p className="mt-2">Loading your passport…</p>
      </div>
    );
  }

  const acceptedBanner = acceptedShares.length > 0 ? (
    <div className="mb-5 overflow-hidden rounded-3xl border border-verified/40 bg-verified-soft/70 p-6 shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_48px_-32px_rgba(15,23,42,0.18)] sm:p-8">
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
                {s.listing?.id ? (
                  <Link
                    to="/listings/$id"
                    params={{ id: s.listing.id }}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-foreground underline-offset-2 hover:underline"
                  >
                    View listing
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-foreground/80">
            Your lease is pending signature. The landlord will be in touch shortly with next steps.
          </p>
        </div>
      </div>
    </div>
  ) : null;

  if (!isComplete) {
    const pct = Math.round((doneCount / 3) * 100);
    return (
      <>
      {acceptedBanner}
      <div className="rounded-3xl border border-border bg-surface p-6 shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_48px_-32px_rgba(15,23,42,0.18)] sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Tenant area
        </p>
        <h2 className="mt-1 font-display text-xl font-semibold tracking-tight sm:text-2xl">
          {doneCount === 0 ? "Start your tenant passport" : "Finish your tenant passport"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {doneCount} of 3 steps complete. Documents you upload are shared securely with landlords
          when you apply — Roost does not run background checks.
        </p>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-verified transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <ul className="mt-5 space-y-2">
          {steps.map((s) => (
            <li
              key={s.key}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface-muted/60 px-3.5 py-2.5"
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                  s.done
                    ? "bg-verified text-[var(--color-verified-foreground)]"
                    : "bg-surface text-muted-foreground"
                }`}
              >
                {s.done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <s.icon className="h-3.5 w-3.5" />}
              </span>
              <span className="font-display text-sm font-medium tracking-tight text-foreground">
                {s.label}
              </span>
              <span
                className={`ml-auto text-[11px] font-semibold uppercase tracking-wider ${
                  s.done ? "text-verified" : "text-muted-foreground"
                }`}
              >
                {s.done ? "Complete" : "Pending"}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate({ to: "/dashboard/passport/edit" })}
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] transition hover:bg-foreground/92"
          >
            {doneCount === 0 ? "Complete my passport" : "Continue passport"}
          </button>
          <Link
            to="/listings"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-secondary"
          >
            Browse properties
          </Link>
        </div>
      </div>
      </>
    );
  }

  const employmentLabel = formatEmployment(passport?.employment_status);
  const monthlyNet = passport?.monthly_income_net ?? null;
  const referencesSubLabel = (() => {
    if (passport?.is_first_time_renter && passport?.guarantor_name) {
      return "Guarantor Provided";
    }
    if (passport?.previous_landlord_name_2) return "2 Landlord References";
    if (passport?.previous_landlord_name) return "1 Landlord Reference";
    return "Self-Certified";
  })();
  const badges: { label: string; icon: typeof IdCard; sub?: string }[] = [
    { label: "Identity", icon: IdCard },
    { label: "Right to Rent", icon: ShieldCheck },
    { label: "Income", icon: Banknote },
    { label: "References", icon: UserRoundCheck, sub: referencesSubLabel },
  ];

  return (
    <>
    {acceptedBanner}
    <div className="rounded-3xl border border-border bg-surface p-6 shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_48px_-32px_rgba(15,23,42,0.18)] sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Tenant passport
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold tracking-tight sm:text-2xl">
            {profile?.full_name || "Your tenant passport"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Documents have been securely uploaded by the tenant. Landlords can review these files
            directly upon application.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-verified px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-verified-foreground)]">
          <BadgeCheck className="h-3.5 w-3.5" />
          Profile Complete • Self-Certified
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {badges.map((b) => (
          <div
            key={b.label}
            className="flex items-center gap-2 rounded-2xl border border-verified/30 bg-verified-soft/50 px-3 py-2.5"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-verified text-[var(--color-verified-foreground)]">
              <b.icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-xs font-semibold tracking-tight text-foreground">
                {b.label}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-verified">
                {b.sub ?? "Self-Certified"}
              </p>
            </div>
          </div>
        ))}
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-2 rounded-2xl border border-border bg-surface-muted/60 p-4 sm:grid-cols-2">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Employment
          </dt>
          <dd className="mt-0.5 font-display text-sm font-semibold tracking-tight text-foreground">
            {employmentLabel}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Monthly net income
          </dt>
          <dd className="mt-0.5 font-display text-sm font-semibold tracking-tight text-foreground">
            {monthlyNet ? `£${Number(monthlyNet).toLocaleString()}` : "—"}
          </dd>
        </div>
      </dl>

      <div className="mt-3 rounded-2xl border border-border bg-surface-muted/60 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Documents on file
        </p>
        <ul className="mt-2 space-y-2">
          <DocumentRow
            label="Identity document"
            path={passport?.id_document_path ?? null}
            stepHash="identity"
          />
          <DocumentRow
            label="Income document"
            path={passport?.income_document_path ?? null}
            stepHash="income"
          />
          <DocumentRow
            label="Reference letter"
            path={passport?.reference_document_path ?? null}
            stepHash="references"
            optional
            sectionFilled={
              !!passport?.previous_landlord_name || !!passport?.guarantor_name
            }
          />
        </ul>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          to="/listings"
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] transition hover:bg-foreground/92"
        >
          <Building2 className="h-3.5 w-3.5" />
          Browse properties
        </Link>
        <button
          type="button"
          onClick={shareLink}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-secondary"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share passport
        </button>
        <Link
          to="/dashboard/passport/edit"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-secondary"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit passport
        </Link>
      </div>
    </div>
    </>
  );
}

function formatEmployment(status: string | null | undefined): string {
  if (!status) return "—";
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

function DocumentRow({
  label,
  path,
  stepHash,
  optional = false,
  sectionFilled = false,
}: {
  label: string;
  path: string | null;
  stepHash: string;
  optional?: boolean;
  sectionFilled?: boolean;
}) {
  const [opening, setOpening] = useState(false);
  const filename = path ? path.split("/").pop() ?? path : null;
  const isImage = !!filename && /\.(jpe?g|png|webp|gif)$/i.test(filename);
  const Icon = isImage ? ImageIcon : FileText;

  const onView = async () => {
    if (!path || opening) return;
    setOpening(true);
    try {
      const { data, error } = await supabase.storage
        .from("tenant-documents")
        .createSignedUrl(path, 60);
      if (error || !data?.signedUrl) throw error ?? new Error("No URL");
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error("Couldn't open document", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setOpening(false);
    }
  };

  if (!path) {
    if (optional && sectionFilled) {
      return (
        <li className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-surface px-3 py-2.5">
          <span className="flex items-center gap-2 min-w-0">
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm text-muted-foreground">
              {label} — not uploaded (optional)
            </span>
          </span>
        </li>
      );
    }
    return (
      <li className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-surface px-3 py-2.5">
        <span className="flex items-center gap-2 min-w-0">
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm text-muted-foreground">
            {label} — not uploaded {optional ? "(optional)" : "yet"}
          </span>
        </span>
        <Link
          to="/dashboard/passport/edit"
          hash={stepHash}
          className="shrink-0 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground transition hover:bg-secondary"
        >
          Add
        </Link>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2.5">
      <span className="flex items-center gap-2 min-w-0">
        <Icon className="h-4 w-4 shrink-0 text-verified" />
        <span className="min-w-0">
          <span className="block truncate font-display text-sm font-semibold tracking-tight text-foreground">
            {label}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">{filename}</span>
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        <span className="hidden rounded-full bg-verified-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-verified sm:inline-block">
          Self-Certified
        </span>
        <button
          type="button"
          onClick={onView}
          disabled={opening}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground transition hover:bg-secondary disabled:opacity-60"
        >
          {opening ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <ExternalLink className="h-3 w-3" />
          )}
          View
        </button>
      </span>
    </li>
  );
}

function MyProperties({
  listings,
  loading,
  onAdd,
}: {
  listings: Listing[];
  loading: boolean;
  onAdd: () => void;
}) {
  return (
    <div>
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
        <div className="rounded-3xl border border-dashed border-border bg-surface p-10 text-center">
          <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-display text-base font-semibold tracking-tight">
            No properties yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Publish your first compliant NI listing in under two minutes.
          </p>
          <button
            type="button"
            onClick={onAdd}
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] transition hover:bg-foreground/92"
          >
            <Plus className="h-3.5 w-3.5" />
            Add new property
          </button>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_48px_-32px_rgba(15,23,42,0.18)]">
          {listings.map((l, i) => (
            <li
              key={l.id}
              className={`flex items-start justify-between gap-3 p-4 transition hover:bg-surface-muted/60 sm:items-center sm:p-5 ${
                i > 0 ? "border-t border-border" : ""
              }`}
            >
              <Link
                to="/listings/$id"
                params={{ id: l.id }}
                className="min-w-0 flex-1 outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 rounded-lg"
                aria-label={`View ${l.title}`}
              >
                <p className="truncate font-display text-base font-semibold tracking-tight">
                  {l.title}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {l.address}
                  {l.location ? ` · ${l.location}` : null}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                  <Flame className="h-3 w-3" />
                  {l.heating_type}
                </p>
              </Link>
              <div className="flex shrink-0 flex-col items-end gap-2 text-right">
                <p className="font-display text-base font-semibold tracking-tight">
                  £{Number(l.monthly_rent).toLocaleString()}
                  <span className="ml-1 text-[11px] font-medium text-muted-foreground">pcm</span>
                </p>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    l.is_published
                      ? "bg-verified-soft text-verified"
                      : "bg-surface-muted text-muted-foreground"
                  }`}
                >
                  {l.is_published ? <ShieldCheck className="h-3 w-3" /> : null}
                  {l.is_published ? "Live" : "Draft"}
                </span>
                <div className="mt-1 flex flex-wrap items-center justify-end gap-1.5">
                  <Link
                    to="/dashboard/applications"
                    search={{ listing: l.id }}
                    className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-[11px] font-medium text-[var(--color-primary-foreground)] transition hover:bg-foreground/92"
                  >
                    <Users className="h-3 w-3" />
                    View applicants
                  </Link>
                  <Link
                    to="/listings/$id"
                    params={{ id: l.id }}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-medium text-foreground transition hover:bg-secondary"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View listing
                  </Link>
                </div>
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
  const [submitting, setSubmitting] = useState<false | "draft" | "publish">(false);

  const togglePref = (label: string) =>
    setPrefs((s) => (s.includes(label) ? s.filter((x) => x !== label) : [...s, label]));

  const save = async (mode: "draft" | "publish") => {
    if (!user || submitting) return;
    setSubmitting(mode);
    try {
      const { error } = await supabase.from("property_listings").insert({
        landlord_id: user.id,
        title,
        address,
        location: [location, postcode].filter(Boolean).join(" · ") || null,
        monthly_rent: Number(rent),
        deposit: Number(deposit),
        ni_landlord_reg_number: regNumber,
        heating_type: heating,
        enforce_empty_in_full_out: heating === "Oil" ? fuelPolicy : false,
        tenant_preferences: prefs,
        is_published: mode === "publish",
      });
      if (error) throw error;
      toast.success(mode === "publish" ? "Listing published" : "Draft saved", {
        description:
          mode === "publish"
            ? "Your property is live and ready for verified NI tenants."
            : "You can finish and publish it any time from My properties.",
      });
      setTitle("");
      setAddress("");
      setLocation("");
      setPostcode("");
      setRent("");
      setDeposit("");
      setRegNumber("");
      await onCreated();
    } catch (err: unknown) {
      toast.error("Could not save listing", {
        description: err instanceof Error ? err.message : "Please try again",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void save("publish");
  };

  const inputCx =
    "mt-1.5 block h-11 w-full rounded-xl border border-border bg-surface-muted px-3.5 text-sm text-foreground placeholder:text-muted-foreground/80 transition focus:border-verified/40 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-verified/20";

  return (
    <form onSubmit={onSubmit}>
      <div className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          New listing
        </p>
        <h2 className="mt-1 font-display text-xl font-semibold tracking-tight sm:text-2xl">
          Create a compliant NI listing
        </h2>
      </div>

      <FormCard eyebrow="Step 01" title="Basic info">
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

      <FormCard eyebrow="Step 02" title="NI compliance verification">
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

      <FormCard eyebrow="Step 03" title="Smart infrastructure">
        <Field label="Heating & utility type">
          <div className="relative mt-1.5">
            <button
              type="button"
              onClick={() => setHeatingOpen((o) => !o)}
              className="flex h-11 w-full items-center justify-between rounded-xl border border-border bg-surface-muted px-3.5 text-left text-sm text-foreground transition focus:border-verified/40 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-verified/20"
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
                className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-[0_24px_48px_-24px_rgba(15,23,42,0.25)]"
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

        {heating === "Oil" ? (
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
                  Empty-In / Full-Out oil agreement
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Tenants accept the tank as empty on move-in and leave it refilled to the
                  same level on move-out. Removes oil-meter disputes and keeps your deposit
                  return clean and predictable.
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
            Select <span className="font-medium text-foreground">Oil</span> to enable Roost's
            Fair Fuel "Empty-In / Full-Out" tenancy clause.
          </div>
        )}
      </FormCard>

      <FormCard eyebrow="Step 04" title="Tenant requirements">
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
                    ? "border-foreground/20 bg-surface shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_28px_-24px_rgba(15,23,42,0.2)]"
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

        <div className="mt-4 flex items-center gap-2 rounded-xl bg-surface-muted px-3 py-2.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span>
            <span className="font-medium text-foreground">38 verified tenants</span> match your
            criteria in BT6 right now.
          </span>
        </div>
      </FormCard>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={() => void save("draft")}
          disabled={submitting !== false}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-surface px-6 py-3.5 font-display text-sm font-semibold text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {submitting === "draft" ? "Saving…" : "Save as draft"}
        </button>
        <button
          type="submit"
          disabled={submitting !== false}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3.5 font-display text-base font-semibold text-[var(--color-primary-foreground)] shadow-[0_12px_28px_-12px_rgba(15,23,42,0.45)] transition hover:translate-y-[-1px] hover:bg-foreground/92 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          <Sparkles className="h-4 w-4" />
          {submitting === "publish" ? "Publishing…" : "Publish listing"}
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
    <section className="mt-5 rounded-3xl border border-border bg-surface p-5 shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_48px_-32px_rgba(15,23,42,0.18)] sm:p-7">
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