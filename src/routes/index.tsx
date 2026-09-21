import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  ClipboardCheck,

  FileSignature,
  Home,
  IdCard,
  LifeBuoy,
  ShieldCheck,
  Wallet,
  Wrench,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RoostNI — Northern Ireland Direct Renting Platform" },
      {
        name: "description",
        content:
          "RoostNI is Northern Ireland's direct renting platform: self-certified tenant passports, compliant landlord listings and full tenancy management built around NI law.",
      },
      { property: "og:title", content: "RoostNI — Northern Ireland Direct Renting Platform" },
      {
        property: "og:description",
        content:
          "Self-certified tenant passports. Compliant landlords. RoostNI handles the whole tenancy across Northern Ireland.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-surface/85 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-foreground text-[var(--color-primary-foreground)]">
              <Home className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <span className="truncate font-display text-sm font-semibold tracking-tight sm:text-base">
              Roost<span className="text-verified">NI</span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-1.5">
            <Link
              to="/listings"
              className="hidden shrink-0 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary sm:inline"
            >
              Browse properties
            </Link>
            <Link
              to="/help"
              className="hidden shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground sm:inline"
            >
              Help
            </Link>
            <Link
              to="/beta"
              className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary"
            >
              Beta
            </Link>
            <Link
              to="/auth"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-[var(--color-primary-foreground)] transition hover:bg-foreground/90 sm:px-4"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pb-12 pt-10 sm:px-6 sm:pb-20 sm:pt-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-verified/30 bg-verified-soft/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                <BadgeCheck className="h-3.5 w-3.5 text-verified" /> Closed beta
              </span>
              <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight sm:text-5xl lg:text-[3.25rem]">
                Renting in Northern Ireland, done direct.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                RoostNI replaces chaotic social-media listings with a clean, NI-focused platform:
                self-certified tenant passports, compliant property listings, digital leases,
                deposit tracking and maintenance — all in one place.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/auth"
                  search={{ role: "tenant" }}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3.5 font-display text-sm font-semibold text-[var(--color-primary-foreground)] shadow-raised transition hover:bg-foreground/92"
                >
                  <IdCard className="h-4 w-4" />
                  I'm a tenant
                </Link>
                <Link
                  to="/auth"
                  search={{ role: "landlord" }}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface px-6 py-3.5 font-display text-sm font-semibold text-foreground shadow-resting transition hover:bg-secondary"
                >
                  <Building2 className="h-4 w-4" />
                  I'm a landlord
                </Link>
                <Link
                  to="/beta"
                  className="inline-flex items-center justify-center gap-1.5 rounded-full px-6 py-3.5 text-sm font-medium text-muted-foreground transition hover:text-foreground sm:px-4"
                >
                  About the beta
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-verified/30 bg-verified-soft/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-verified" />
                  <span>
                    <span className="block text-sm font-semibold text-foreground">
                      Landlords: is your tenancy paperwork in order?
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Free two-minute NI compliance and tenancy readiness audit — no account
                      needed.
                    </span>
                  </span>
                </div>
                <Link
                  to="/audit"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 font-display text-sm font-semibold text-[var(--color-primary-foreground)] shadow-raised transition hover:bg-foreground/92"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  Run Free Landlord Audit
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-border bg-surface p-6 shadow-floating sm:p-8">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-verified text-[var(--color-verified-foreground)]">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display text-base font-semibold tracking-tight">Tenant Passport</p>
                  <p className="text-xs text-muted-foreground">Self-certified · ready to share</p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                <PassportRow icon={IdCard} label="Identity &amp; photo ID" done />
                <PassportRow icon={Wallet} label="Income &amp; employment" done />
                <PassportRow icon={ShieldCheck} label="References or guarantor" done />
              </div>
              <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface-muted/40 p-4 text-center">
                <p className="text-sm font-medium text-foreground">Apply to any listing in one tap</p>
                <p className="mt-0.5 text-xs text-muted-foreground">No more re-typing your details.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-y border-border bg-surface/60 py-12 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Why RoostNI
              </p>
              <h2 className="mx-auto mt-2 max-w-2xl font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                Built for the whole tenancy, not just the listing.
              </h2>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FeatureCard
                icon={IdCard}
                title="Tenant Passport"
                body="Identity, income and references in one shareable profile. You control who sees it."
              />
              <FeatureCard
                icon={Building2}
                title="Compliant listings"
                body="NI landlord registration, heating type, Fair Fuel terms and safety certificates."
              />
              <FeatureCard
                icon={FileSignature}
                title="Digital lease"
                body="Issue, sign and counter-sign a NI tenancy agreement with statutory clauses."
              />
              <FeatureCard
                icon={Wallet}
                title="Deposit &amp; rent"
                body="Track move-in funds, protect the deposit and keep a rent ledger with reminders."
              />
              <FeatureCard
                icon={Wrench}
                title="Maintenance"
                body="Report repairs with photos and keep a timestamped record between tenant and landlord."
              />
              <FeatureCard
                icon={ShieldCheck}
                title="Safety vault"
                body="EPC, gas safety, EICR and smoke/CO records with expiry reminders."
              />
              <FeatureCard
                icon={Home}
                title="End of tenancy"
                body="Notice to Quit, final inspection and deposit settlement guided step by step."
              />
              <FeatureCard
                icon={LifeBuoy}
                title="Help &amp; FAQ"
                body="Plain-language guidance on NI notice periods, deposits and tenant rights."
              />
            </div>
          </div>
        </section>

        {/* Two paths */}
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="grid gap-6 lg:grid-cols-2">
            <PathCard
              title="For tenants"
              steps={[
                "Create your free Tenant Passport.",
                "Add identity, income and references.",
                "Browse listings and apply with one tap.",
                "Sign your lease and manage your tenancy.",
              ]}
              cta={{ to: "/auth", search: { role: "tenant" }, label: "Create a passport" }}
            />
            <PathCard
              title="For landlords"
              steps={[
                "List your property with your NI registration number.",
                "Receive pre-screened passport applications.",
                "Issue a lease and protect the deposit.",
                "Manage rent, repairs and certificates.",
              ]}
              cta={{ to: "/auth", search: { role: "landlord" }, label: "List a property" }}
            />
          </div>
        </section>

        {/* Beta banner */}
        <section className="mx-auto mb-12 max-w-6xl px-4 sm:px-6 sm:mb-16">
          <div className="rounded-[2rem] border border-border bg-surface p-6 shadow-resting sm:p-10">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="font-display text-lg font-semibold tracking-tight sm:text-xl">
                  RoostNI is in closed beta
                </p>
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                  We're testing with a small group of tenants and landlords across Northern Ireland.
                  Your feedback shapes what ships next.
                </p>
              </div>
              <Link
                to="/beta"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary"
              >
                Join the beta
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-8 sm:flex-row sm:items-center sm:px-6">
          <span className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-foreground text-[var(--color-primary-foreground)]">
              <Home className="h-3.5 w-3.5" strokeWidth={2.25} />
            </span>
            <span className="font-display text-sm font-semibold tracking-tight">
              Roost<span className="text-verified">NI</span>
            </span>
          </span>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <Link to="/listings" className="transition hover:text-foreground">
              Browse
            </Link>
            <Link to="/help" className="transition hover:text-foreground">
              Help
            </Link>
            <Link to="/beta" className="transition hover:text-foreground">
              Beta
            </Link>
            <Link to="/auth" className="transition hover:text-foreground">
              Sign in
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} RoostNI · Northern Ireland
          </p>
        </div>
      </footer>
    </div>
  );
}

function PassportRow({
  icon: Icon,
  label,
  done,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  done?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-muted/40 px-3 py-2.5">
      <span
        className={`grid h-7 w-7 place-items-center rounded-lg ${
          done ? "bg-verified text-[var(--color-verified-foreground)]" : "bg-surface text-muted-foreground"
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      {done ? (
        <BadgeCheck className="h-4 w-4 text-verified" />
      ) : (
        <span className="h-4 w-4 rounded-full border border-border" />
      )}
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-5 shadow-resting transition hover:border-foreground/20">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-surface-muted">
        <Icon className="h-4 w-4 text-foreground" />
      </span>
      <p className="mt-3 font-display text-sm font-semibold tracking-tight">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function PathCard({
  title,
  steps,
  cta,
}: {
  title: string;
  steps: string[];
  cta: { to: "/auth"; search: { role: "tenant" | "landlord" }; label: string };
}) {
  return (
    <div className="rounded-[2rem] border border-border bg-surface p-6 shadow-resting sm:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </p>
      <ol className="mt-4 space-y-3">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-foreground">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-surface-muted text-[10px] font-semibold text-muted-foreground">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      <Link
        to={cta.to}
        search={cta.search}
        className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-[var(--color-primary-foreground)] transition hover:bg-foreground/92"
      >
        {cta.label}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
