import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { LogoMark } from "@/components/logo";
import { posthog } from "@/integrations/posthog/client";
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
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Let & Rent Direct in Northern Ireland — No Agent Fees | RoostNI" },
      {
        name: "description",
        content:
          "Self-managing NI landlords: list and manage rentals without agent fees, with NI tenancy law built in. Renters: one Tenant Passport to apply direct. Free in beta.",
      },
      { property: "og:title", content: "Let & Rent Direct in Northern Ireland — No Agent Fees | RoostNI" },
      {
        property: "og:description",
        content:
          "Self-managing NI landlords: list and manage rentals without agent fees, with NI tenancy law built in. Renters: one Tenant Passport to apply direct. Free in beta.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://roostni.co.uk/" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://roostni.co.uk/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": "https://roostni.co.uk/#organization",
              name: "RoostNI",
              url: "https://roostni.co.uk/",
              logo: "https://roostni.co.uk/favicon.png",
              areaServed: { "@type": "AdministrativeArea", name: "Northern Ireland" },
            },
            {
              "@type": "SoftwareApplication",
              name: "RoostNI",
              url: "https://roostni.co.uk/",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              description:
                "Self-service platform for Northern Ireland private landlords and tenants: direct property listings, tenancy management with NI tenancy law built in, and a reusable self-certified Tenant Passport. Free during beta.",
              areaServed: { "@type": "AdministrativeArea", name: "Northern Ireland" },
              offers: { "@type": "Offer", price: "0", priceCurrency: "GBP", description: "Free during the open beta" },
              publisher: { "@id": "https://roostni.co.uk/#organization" },
            },
          ],
        }),
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [side, setSide] = useState<"tenant" | "landlord">("landlord");
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-surface/85 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
        <div className="mx-auto grid h-14 w-full max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 sm:flex sm:justify-between sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <LogoMark />
            <span className="truncate font-display text-sm font-semibold tracking-tight sm:text-base">
              Roost<span className="text-verified">NI</span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-1.5">
            <Link
              to="/listings"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary"
            >
              <Home className="h-3.5 w-3.5" />
              <span className="sm:hidden">Browse</span>
              <span className="hidden sm:inline">Browse properties</span>
            </Link>
            <Link
              to="/auth"
              onClick={() => posthog.capture("home_cta_click", { target: "header_list" })}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary"
            >
              <Building2 className="h-3.5 w-3.5" />
              <span className="sm:hidden">List</span>
              <span className="hidden sm:inline">For landlords</span>
            </Link>
            <Link
              to="/help"
              className="hidden shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground sm:inline"
            >
              Help
            </Link>
            <Link
              to="/beta"
              className="hidden shrink-0 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary sm:inline"
            >
              Beta
            </Link>
            <Link
              to="/auth"
              search={{ mode: "login" }}
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
                <BadgeCheck className="h-3.5 w-3.5 text-verified" /> Free early beta
              </span>
              <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight sm:text-5xl lg:text-[3.25rem]">
                Northern Ireland renting, managed direct.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                For self-managing landlords: list, let and manage your property without letting
                agent fees, with NI tenancy law built in. For renters: one reusable Tenant
                Passport to apply direct to landlords across Northern Ireland.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <Link
                  to="/auth"
                  onClick={() => posthog.capture("home_cta_click", { target: "list_property" })}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3.5 font-display text-sm font-semibold text-[var(--color-primary-foreground)] shadow-raised transition hover:bg-foreground/92"
                >
                  <Building2 className="h-4 w-4" />
                  List a property free
                </Link>
                <Link
                  to="/listings"
                  onClick={() => posthog.capture("home_cta_click", { target: "listings" })}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3.5 font-display text-sm font-semibold text-[var(--color-primary-foreground)] shadow-raised transition hover:bg-foreground/92"
                >
                  <Home className="h-4 w-4" />
                  Find a home
                </Link>
              </div>
              <Link
                to="/audit"
                onClick={() => posthog.capture("home_cta_click", { target: "audit" })}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-surface px-6 py-3 font-display text-sm font-semibold text-foreground shadow-resting transition hover:bg-secondary sm:w-auto"
              >
                <ClipboardCheck className="h-4 w-4 text-verified" />
                Landlords: free 5-question NI compliance check
              </Link>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                No account needed to browse or run the audit.{" "}
                <Link
                  to="/auth"
                  search={{ mode: "login" }}
                  className="font-medium text-foreground underline-offset-2 hover:underline"
                >
                  Sign in
                </Link>
                {" · "}
                <Link
                  to="/beta"
                  className="font-medium text-foreground underline-offset-2 hover:underline"
                >
                  About the beta
                </Link>
              </p>
              <div className="mt-6 rounded-2xl border border-border bg-surface p-2 shadow-resting">
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-muted/60 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSide("tenant");
                      posthog.capture("home_side_switch", { side: "tenant" });
                    }}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      side === "tenant"
                        ? "bg-surface text-foreground shadow-resting"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Looking for a home?
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSide("landlord");
                      posthog.capture("home_side_switch", { side: "landlord" });
                    }}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      side === "landlord"
                        ? "bg-surface text-foreground shadow-resting"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Self-managing a rental?
                  </button>
                </div>
                <div className="grid">
                  <div
                    className={`col-start-1 row-start-1 p-4 ${side === "tenant" ? "" : "invisible"}`}
                    aria-hidden={side !== "tenant"}
                    inert={side !== "tenant"}
                  >
                    <ul className="space-y-2.5 text-sm text-foreground">
                      <li className="flex items-start gap-2.5">
                        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-verified" />
                        Real NI listings with rent, area and certificates up front.
                      </li>
                      <li className="flex items-start gap-2.5">
                        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-verified" />
                        Build a free Tenant Passport — apply in one tap, no re-typing.
                      </li>
                      <li className="flex items-start gap-2.5">
                        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-verified" />
                        Message landlords direct. No agent calls, no paper forms.
                      </li>
                    </ul>
                    <Link
                      to="/listings"
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground underline-offset-2 hover:underline"
                    >
                      Browse rentals now
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                  <div
                    className={`col-start-1 row-start-1 p-4 ${side === "landlord" ? "" : "invisible"}`}
                    aria-hidden={side !== "landlord"}
                    inert={side !== "landlord"}
                  >
                    <ul className="space-y-2.5 text-sm text-foreground">
                      <li className="flex items-start gap-2.5">
                        <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-verified" />
                        No tenant-find fee or monthly management cut — you stay in control.
                      </li>
                      <li className="flex items-start gap-2.5">
                        <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-verified" />
                        Applicants arrive with an organised, self-certified Tenant Passport — you make your own checks and decide.
                      </li>
                      <li className="flex items-start gap-2.5">
                        <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-verified" />
                        28-day notice, deposit, rent receipts and certificates tracked under NI law.
                      </li>
                    </ul>
                    <Link
                      to="/audit"
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground underline-offset-2 hover:underline"
                    >
                      Run the free 5-question check
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
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

        {/* Landlord value */}
        <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 sm:pb-16">
          <div className="rounded-[2rem] border border-border bg-surface p-6 shadow-floating sm:p-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              For self-managing landlords
            </p>
            <h2 className="mt-2 max-w-2xl font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Run your let yourself, without handing an agent a cut of your rent.
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <FeatureCard icon={Wallet} title="Keep your rent" body="No tenant-find fee and no monthly management percentage while RoostNI is in free beta." />
              <FeatureCard icon={ShieldCheck} title="NI law built in" body="Private Tenancies Act (NI) 2022 steps — 28-day notice, deposit protection, rent receipts, notice to quit — prompted as you go." />
              <FeatureCard icon={IdCard} title="Organised applications" body="Renters apply with a reusable, self-certified Tenant Passport. RoostNI never scores or recommends — the decision is always yours." />
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              Renters benefit too: one passport, no re-typing, and clear listings with certificates up front.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link to="/auth" onClick={() => posthog.capture("home_cta_click", { target: "landlord_section_list" })} className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 font-display text-sm font-semibold text-[var(--color-primary-foreground)] transition hover:bg-foreground/92">
                List a property free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/audit" onClick={() => posthog.capture("home_cta_click", { target: "landlord_section_audit" })} className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface px-6 py-3 font-display text-sm font-semibold text-foreground transition hover:bg-secondary">
                Run the free 5-question check
              </Link>
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
                "Browse NI listings with full details up front.",
                "Create your free Tenant Passport when you find a home.",
                "Apply with one tap — no re-typing your details.",
                "Sign your lease and manage your tenancy.",
              ]}
              cta={{ to: "/listings", label: "Browse rentals" }}
            />
            <PathCard
              title="For landlords"
              steps={[
                "Run the free 5-question NI compliance check.",
                "List your property with your NI registration number.",
                "Receive organised, self-certified passport applications — the decision stays yours.",
                "Manage rent, repairs and certificates in one place.",
              ]}
              cta={{ to: "/audit", label: "Run the free audit" }}
            />
          </div>
        </section>

        {/* Beta banner */}
        <section className="mx-auto mb-12 max-w-6xl px-4 sm:px-6 sm:mb-16">
          <div className="rounded-[2rem] border border-border bg-surface p-6 shadow-resting sm:p-10">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="font-display text-lg font-semibold tracking-tight sm:text-xl">
                  RoostNI is in free early beta
                </p>
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                  Anyone can join now — no fees, no card required. Your feedback shapes what ships next.
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
            <Link to="/auth" search={{ mode: "login" }} className="transition hover:text-foreground">
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
  cta: { to: "/listings" | "/audit"; label: string };
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
        className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-[var(--color-primary-foreground)] transition hover:bg-foreground/92"
      >
        {cta.label}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
