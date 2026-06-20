import { createFileRoute, Link } from "@tanstack/react-router";
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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/dashboard-shell";

export const Route = createFileRoute("/_authenticated/dashboard")({
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
  const { user, profile } = useAuth();
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
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    loadListings();
    if (isLandlord) {
      supabase
        .from("passport_shares")
        .select("id", { count: "exact", head: true })
        .then(({ count }) => setApplicationsCount(count ?? 0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLandlord]);

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
  return (
    <div className="rounded-3xl border border-border bg-surface p-6 shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_48px_-32px_rgba(15,23,42,0.18)] sm:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Tenant area
      </p>
      <h2 className="mt-1 font-display text-xl font-semibold tracking-tight sm:text-2xl">
        Your verified passport is ready
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        We're building your Tenant Passport editor next. For now, head back to your passport view to
        share verified ID, income and references with NI landlords.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          to="/dashboard/passport/edit"
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] transition hover:bg-foreground/92"
        >
          Complete my passport
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-secondary"
        >
          View passport
        </Link>
        <Link
          to="/listings"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-secondary"
        >
          Browse properties
        </Link>
      </div>
    </div>
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
              className={`flex items-start justify-between gap-3 p-4 sm:items-center sm:p-5 ${
                i > 0 ? "border-t border-border" : ""
              }`}
            >
              <div className="min-w-0">
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
              </div>
              <div className="text-right">
                <p className="font-display text-base font-semibold tracking-tight">
                  £{Number(l.monthly_rent).toLocaleString()}
                  <span className="ml-1 text-[11px] font-medium text-muted-foreground">pcm</span>
                </p>
                <span
                  className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    l.is_published
                      ? "bg-verified-soft text-verified"
                      : "bg-surface-muted text-muted-foreground"
                  }`}
                >
                  {l.is_published ? <ShieldCheck className="h-3 w-3" /> : null}
                  {l.is_published ? "Live" : "Draft"}
                </span>
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
  const [regNumber, setRegNumber] = useState("");
  const [heating, setHeating] = useState<string>("Bulk Oil Tank");
  const [heatingOpen, setHeatingOpen] = useState(false);
  const [fuelPolicy, setFuelPolicy] = useState(true);
  const [prefs, setPrefs] = useState<string[]>(["Long-term tenancy", "Non-smoker"]);
  const [submitting, setSubmitting] = useState(false);

  const togglePref = (label: string) =>
    setPrefs((s) => (s.includes(label) ? s.filter((x) => x !== label) : [...s, label]));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || submitting) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("property_listings").insert({
        landlord_id: user.id,
        title,
        address,
        location: location || null,
        monthly_rent: Number(rent),
        deposit: Number(deposit),
        ni_landlord_reg_number: regNumber,
        heating_type: heating,
        enforce_empty_in_full_out: fuelPolicy,
        tenant_preferences: prefs,
        is_published: true,
      });
      if (error) throw error;
      toast.success("Listing Live", {
        description: "Ready to receive verified NI Tenant Passports.",
      });
      setTitle("");
      setAddress("");
      setLocation("");
      setRent("");
      setDeposit("");
      setRegNumber("");
      await onCreated();
    } catch (err: unknown) {
      toast.error("Could not publish listing", {
        description: err instanceof Error ? err.message : "Please try again",
      });
    } finally {
      setSubmitting(false);
    }
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
          <Field label="Postcode / area">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="BT6"
              className={inputCx}
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
          <Field label="Desired deposit" className="sm:col-span-2">
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
          hint="Required for legal portal compliance. Format: LRN-NI-XXXXXX."
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

        <button
          type="button"
          onClick={() => setFuelPolicy((v) => !v)}
          aria-pressed={fuelPolicy}
          className={`mt-5 flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition ${
            fuelPolicy
              ? "border-verified/30 bg-verified-soft/50"
              : "border-border bg-surface-muted hover:bg-secondary"
          }`}
        >
          <span
            className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
              fuelPolicy ? "bg-verified" : "bg-border"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-surface shadow transition ${
                fuelPolicy ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </span>
          <span className="min-w-0">
            <span className="block font-display text-sm font-semibold tracking-tight text-foreground">
              Enforce "Empty-in, Full-out" fuel agreement policy
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              Tenants top up the tank on move-in and leave it full on move-out.
            </span>
          </span>
        </button>

        <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Roost auto-matches your listing to tenants who already accept this policy.
        </div>
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

      <div className="mt-6 flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 py-4 font-display text-base font-semibold text-[var(--color-primary-foreground)] shadow-[0_12px_28px_-12px_rgba(15,23,42,0.45)] transition hover:translate-y-[-1px] hover:bg-foreground/92 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          <Sparkles className="h-4 w-4" />
          {submitting ? "Publishing…" : "Generate Compliant NI Listing"}
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