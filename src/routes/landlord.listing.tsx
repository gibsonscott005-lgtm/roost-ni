import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ViewSwitcher } from "../components/view-switcher";
import {
  Bell,
  ChevronDown,
  Home,
  MapPin,
  PoundSterling,
  Building2,
  ShieldCheck,
  Flame,
  Check,
  Sparkles,
  Lock,
  Info,
  Users,
  X,
} from "lucide-react";

export const Route = createFileRoute("/landlord/listing")({
  head: () => ({
    meta: [
      { title: "Create Listing — Roost NI for Landlords" },
      {
        name: "description",
        content:
          "Create a fully compliant Northern Ireland rental listing in minutes. Verified, transparent and tenant-ready.",
      },
      { property: "og:title", content: "Create Listing — Roost NI" },
      {
        property: "og:description",
        content:
          "List your NI property with built-in landlord registration checks and honest fuel-policy agreements.",
      },
    ],
  }),
  component: LandlordListing,
});

const HEATING_OPTIONS = [
  "Mains Gas",
  "Bulk Oil Tank",
  "Bulk LPG Tank",
  "Economy 7 Electric",
];

const TENANT_PREFS = [
  { label: "Long-term tenancy", hint: "12 months or more" },
  { label: "Non-smoker", hint: "Indoors and shared areas" },
  { label: "Pets considered", hint: "Case-by-case basis" },
  { label: "Professional / Employed", hint: "Stable income evidence" },
  { label: "Couples welcome", hint: "Joint tenancy agreements" },
  { label: "Students considered", hint: "With guarantor" },
];

function LandlordListing() {
  const [published, setPublished] = useState(false);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 pb-36 pt-6 sm:px-6 sm:pt-10">
        <ViewSwitcher />
        {published ? <PublishedBanner onDismiss={() => setPublished(false)} /> : null}
        <PageIntro />
        <BasicInfoCard />
        <ComplianceCard />
        <InfrastructureCard />
        <TenantRequirementsCard />
        <PublishBar published={published} onPublish={() => setPublished(true)} />
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-surface/85 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-foreground text-[var(--color-primary-foreground)]">
            <Home className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <span className="font-display text-base font-semibold tracking-tight">
            Roost<span className="text-verified">.</span>ni
          </span>
          <span className="ml-2 hidden rounded-full border border-border bg-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:inline">
            Landlord
          </span>
        </Link>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Notifications"
            className="relative grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-foreground/80 transition hover:bg-secondary"
          >
            <Bell className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-2.5 text-sm transition hover:bg-secondary"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-secondary font-display text-xs font-semibold text-foreground">
              CO
            </span>
            <span className="hidden text-sm font-medium sm:inline">Ciara</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </header>
  );
}

function PageIntro() {
  return (
    <div className="mb-6">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        New listing
      </p>
      <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        Create a compliant NI property listing
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        A few honest details — verified once, trusted by every Roost tenant.
      </p>
    </div>
  );
}

function Card({
  eyebrow,
  title,
  hint,
  children,
}: {
  eyebrow: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5 rounded-3xl border border-border bg-surface p-5 shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_48px_-32px_rgba(15,23,42,0.18)] sm:p-7">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {eyebrow}
      </p>
      <h2 className="mt-1 font-display text-lg font-semibold tracking-tight sm:text-xl">
        {title}
      </h2>
      {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
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

const inputCx =
  "mt-1.5 block h-11 w-full rounded-xl border border-border bg-surface-muted px-3.5 text-sm text-foreground placeholder:text-muted-foreground/80 transition focus:border-foreground/30 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-foreground/10";

function BasicInfoCard() {
  return (
    <Card
      eyebrow="Step 01"
      title="Basic info"
      hint="The headline details every tenant will see first."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Property title" className="sm:col-span-2">
          <input
            type="text"
            placeholder="Bright 2-bed terrace near Ormeau Park"
            className={inputCx}
          />
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="42 Ravenhill Avenue, Belfast, BT6 8DR"
              className={`${inputCx} pl-9`}
            />
          </div>
        </Field>
        <Field label="Monthly rent">
          <div className="relative">
            <PoundSterling className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              inputMode="numeric"
              placeholder="895"
              className={`${inputCx} pl-9`}
            />
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
              pcm
            </span>
          </div>
        </Field>
        <Field label="Desired deposit">
          <div className="relative">
            <PoundSterling className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              inputMode="numeric"
              placeholder="895"
              className={`${inputCx} pl-9`}
            />
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
              one month
            </span>
          </div>
        </Field>
      </div>
    </Card>
  );
}

function ComplianceCard() {
  return (
    <Card
      eyebrow="Step 02"
      title="NI compliance verification"
      hint="Verified once and displayed as a trust badge on your listing."
    >
      <Field
        label="Northern Ireland Landlord Registration Number"
        hint="Required for legal portal compliance. Format: LRN-NI-XXXXXX."
      >
        <div className="relative">
          <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="LRN-NI-284119"
            className={`${inputCx} pl-9 uppercase tracking-wider`}
          />
        </div>
      </Field>

      <div className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-2xl border border-verified/20 bg-verified-soft/50 p-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface text-verified shadow-sm">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-verified">
            Roost verification
          </p>
          <p className="mt-0.5 text-sm text-foreground">
            We cross-check your number against the NI Landlord Registration Scheme. Tenants only
            see a green “Registered Landlord” badge — never your personal data.
          </p>
        </div>
      </div>
    </Card>
  );
}

function InfrastructureCard() {
  const [heating, setHeating] = useState<string>("Bulk Oil Tank");
  const [fuelPolicy, setFuelPolicy] = useState(true);
  const [open, setOpen] = useState(false);

  return (
    <Card
      eyebrow="Step 03"
      title="Smart infrastructure"
      hint="The local details that make or break a Northern Ireland tenancy."
    >
      <Field label="Heating & utility type">
        <div className="relative mt-1.5">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex h-11 w-full items-center justify-between rounded-xl border border-border bg-surface-muted px-3.5 text-left text-sm text-foreground transition focus:border-foreground/30 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-foreground/10"
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <span className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-muted-foreground" />
              {heating}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition ${open ? "rotate-180" : ""}`}
            />
          </button>
          {open ? (
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
                        setOpen(false);
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
            Enforce “Empty-in, Full-out” fuel agreement policy
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            Tenants top up the tank on move-in and leave it full on move-out. Removes the most
            common end-of-tenancy dispute in NI.
          </span>
        </span>
      </button>

      <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Roost auto-matches your listing to tenants who have already accepted this policy in their
        Passport preferences.
      </div>
    </Card>
  );
}

function TenantRequirementsCard() {
  const [selected, setSelected] = useState<string[]>([
    "Long-term tenancy",
    "Non-smoker",
  ]);

  const toggle = (label: string) =>
    setSelected((s) => (s.includes(label) ? s.filter((x) => x !== label) : [...s, label]));

  return (
    <Card
      eyebrow="Step 04"
      title="Tenant requirements"
      hint="We’ll only surface your listing to verified Passports that match."
    >
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {TENANT_PREFS.map(({ label, hint }) => {
          const active = selected.includes(label);
          return (
            <button
              key={label}
              type="button"
              onClick={() => toggle(label)}
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
    </Card>
  );
}

function PublishedBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      role="status"
      className="mb-6 grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-2xl border border-verified/30 bg-verified-soft/60 p-4 sm:p-5"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface text-verified shadow-sm">
        <ShieldCheck className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-verified">
          Compliant listing
        </p>
        <p className="mt-0.5 font-display text-base font-semibold tracking-tight text-foreground">
          Listing Live
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ready to receive verified NI Tenant Passports.
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-surface hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function PublishBar({
  published,
  onPublish,
}: {
  published: boolean;
  onPublish: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/90 px-4 py-3 backdrop-blur sm:static sm:mt-10 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-0">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
        <button
          type="button"
          onClick={onPublish}
          disabled={published}
          className={`group inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 font-display text-base font-semibold shadow-[0_12px_28px_-12px_rgba(15,23,42,0.45)] transition active:translate-y-0 ${
            published
              ? "cursor-default bg-verified text-[var(--color-verified-foreground,white)]"
              : "bg-foreground text-[var(--color-primary-foreground)] hover:translate-y-[-1px] hover:bg-foreground/92"
          }`}
        >
          {published ? <Check className="h-4 w-4" strokeWidth={3} /> : <Sparkles className="h-4 w-4" />}
          {published ? "Listing published" : "Generate Compliant NI Listing"}
        </button>
      </div>
      <p className="mx-auto mt-2 flex max-w-3xl items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <Lock className="h-3 w-3" />
        Reviewed against NI Landlord Registration Scheme · published in under 60 seconds
      </p>
    </div>
  );
}