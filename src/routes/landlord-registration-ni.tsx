import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgePoundSterling,
  ClipboardCheck,
  FileText,
  RefreshCcw,
  ShieldAlert,
  UserCheck,
} from "lucide-react";
import { posthog } from "@/integrations/posthog/client";

const PAGE_URL = "https://roostni.co.uk/landlord-registration-ni";

export const Route = createFileRoute("/landlord-registration-ni")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Landlord Registration NI: A Plain-English Guide — RoostNI" },
      {
        name: "description",
        content:
          "Every private landlord in Northern Ireland must register with the Landlord Registration Scheme. What it costs (£70 online), what you need, renewals every three years, and the penalties for skipping it.",
      },
      {
        property: "og:title",
        content: "Landlord registration in Northern Ireland — the plain-English guide",
      },
      {
        property: "og:description",
        content:
          "Who must register, what it costs, what you need to hand, renewals every three years, and what happens if you don't. A clear guide for NI landlords.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: PAGE_URL },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Landlord registration in Northern Ireland: the plain-English guide",
          description:
            "Who must register with the NI Landlord Registration Scheme, what it costs, what you need, renewals and penalties.",
          author: { "@type": "Organization", name: "RoostNI" },
          publisher: { "@type": "Organization", name: "RoostNI" },
          datePublished: "2026-09-21",
          dateModified: "2026-09-21",
        }),
      },
    ],
  }),
  component: LandlordRegistrationGuide,
});

const WHAT_YOU_NEED = [
  "Your full name, date of birth, home address, email and phone numbers",
  "A Northern Ireland postal address (if different from your home address)",
  "The address and postcode of every property you let or intend to let",
  "The year each property was built",
  "Names and contact details of any joint owners",
  "Your company registration number, if the landlord is a company",
  "Details of any agent acting on your behalf",
  "A HMO registration certificate number, if any property is a house in multiple occupation",
];

const OTHER_DUTIES = [
  {
    title: "Tenancy Information Notice",
    body: "You must give your tenant a free Tenancy Information Notice within 28 days of the tenancy starting.",
  },
  {
    title: "Deposit protection within 28 days",
    body: "Any tenancy deposit must go into an approved scheme — TDS NI, MyDeposits NI or Letting Protection Service NI — within 28 days of receiving it, with the prescribed information given to the tenant.",
  },
  {
    title: "Energy Performance Certificate",
    body: "A valid EPC is required before a property is marketed, and the tenant should receive a copy.",
  },
  {
    title: "Gas safety certificate",
    body: "Where there's a gas supply, an annual Gas Safe check is a legal requirement and the record goes to the tenant.",
  },
  {
    title: "Rent book and receipts",
    body: "Tenants are entitled to a rent book, and to receipts for cash payments.",
  },
  {
    title: "Correct notice periods",
    body: "Notice to quit depends on tenancy length: 4 weeks under 12 months, 8 weeks up to 10 years, and 12 weeks beyond that.",
  },
];

function LandlordRegistrationGuide() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70 bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <LogoMark />
            <span className="font-display text-base font-semibold tracking-tight">
              Roost<span className="text-verified">NI</span>
            </span>
          </Link>
          <Link
            to="/auth"
            className="rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          Guide · Northern Ireland
        </span>
        <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Landlord registration in Northern Ireland: the plain-English guide
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          If you let a property in Northern Ireland, registering as a landlord isn't optional — it's
          one of the first legal duties of the job. Here's what the Landlord Registration Scheme is,
          what it costs, and how to stay on the right side of it.
        </p>

        <section className="mt-10 rounded-3xl border border-border bg-surface p-6 shadow-resting sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-surface-muted">
              <UserCheck className="h-5 w-5 text-foreground" />
            </span>
            <h2 className="font-display text-xl font-semibold tracking-tight">
              Do I need to register?
            </h2>
          </div>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Yes, almost certainly. Every private landlord who lets a property under a private
              tenancy in Northern Ireland must register with the{" "}
              <strong className="font-medium text-foreground">Landlord Registration Scheme</strong>,
              run by the Department for Communities. The scheme has been in place since February
              2014, and you should be registered <em>before</em> a new tenancy begins.
            </p>
            <p>
              One registration covers you as a landlord, no matter how many properties you own —
              you pay a single fee, not a fee per property. If you own properties jointly, each
              owner registers, but only the lead landlord pays the fee.
            </p>
            <p>
              The register is public: anyone, including a prospective tenant, can search it by
              landlord name or property address to check you're registered.
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-border bg-surface p-6 shadow-resting sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-surface-muted">
              <BadgePoundSterling className="h-5 w-5 text-foreground" />
            </span>
            <h2 className="font-display text-xl font-semibold tracking-tight">What it costs</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-surface-muted/60 p-4">
              <p className="font-display text-2xl font-semibold">£70</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Online or by telephone (0300 200 7821)
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface-muted/60 p-4">
              <p className="font-display text-2xl font-semibold">£80</p>
              <p className="mt-1 text-xs text-muted-foreground">Paper registration form</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Registration lasts <strong className="font-medium text-foreground">three years</strong>.
            If you've paid to register a house in multiple occupation under the HMO scheme, you don't
            pay the landlord registration fee as well.
          </p>
        </section>

        <section className="mt-6 rounded-3xl border border-border bg-surface p-6 shadow-resting sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-surface-muted">
              <ClipboardCheck className="h-5 w-5 text-foreground" />
            </span>
            <h2 className="font-display text-xl font-semibold tracking-tight">
              What you'll need to hand
            </h2>
          </div>
          <ul className="mt-4 space-y-2.5">
            {WHAT_YOU_NEED.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-verified" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            Register online at{" "}
            <a
              href="https://www.nidirect.gov.uk/services/register-landlord-or-renew-your-landlord-registration"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground underline underline-offset-4 hover:text-verified"
            >
              nidirect
            </a>{" "}
            — the more properties you have, the longer it takes, so gather the details first.
          </p>
        </section>

        <section className="mt-6 rounded-3xl border border-border bg-surface p-6 shadow-resting sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-surface-muted">
              <RefreshCcw className="h-5 w-5 text-foreground" />
            </span>
            <h2 className="font-display text-xl font-semibold tracking-tight">Renewals</h2>
          </div>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Your registration certificate shows the expiry date. About eight weeks before it
              lapses, a renewal reminder goes to the email address you registered with — check your
              spam folder, because if the reminder goes missing the responsibility is still yours.
            </p>
            <p>
              If you keep letting properties with an expired registration, you're no longer complying
              with the law, even if you registered correctly the first time.
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-destructive/25 bg-surface p-6 shadow-resting sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-destructive/10">
              <ShieldAlert className="h-5 w-5 text-destructive" />
            </span>
            <h2 className="font-display text-xl font-semibold tracking-tight">
              If you don't register
            </h2>
          </div>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Letting without registering is an offence. It can mean a{" "}
              <strong className="font-medium text-foreground">£500 fixed penalty</strong>, or a{" "}
              <strong className="font-medium text-foreground">court fine of up to £2,500</strong>.
            </p>
            <p>
              Because the register is public, a tenant who checks and finds nothing can ask for the
              matter to be investigated. It's a small fee every three years against a needless risk.
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-border bg-surface p-6 shadow-resting sm:p-8">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Registration is only the start
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Registering gets you a certificate — it doesn't cover the rest of your statutory duties
            as an NI landlord. These are the ones that most often catch landlords out:
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {OTHER_DUTIES.map((duty) => (
              <div key={duty.title} className="rounded-2xl border border-border bg-surface-muted/60 p-4">
                <p className="text-sm font-medium text-foreground">{duty.title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{duty.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-border bg-foreground p-6 text-[var(--color-primary-foreground)] shadow-floating sm:p-8">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            How does the rest of your paperwork shape up?
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-primary-foreground)]/80">
            Our free two-minute self-check covers registration plus the other main statutory duties —
            deposit protection, safety certificates, notices and rent records. Twelve questions, your
            score straight away, no email or account needed.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              to="/audit"
              onClick={() => posthog.capture("audit_cta_clicked", { source: "registration_guide" })}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary-foreground)] px-5 py-2.5 font-display text-sm font-semibold text-foreground shadow-raised transition hover:opacity-92"
            >
              <ClipboardCheck className="h-4 w-4" />
              Run Free Landlord Audit
            </Link>
            <Link
              to="/beta"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary-foreground)]/85 underline-offset-4 hover:underline"
            >
              About the free early beta
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        <p className="mt-10 text-xs leading-relaxed text-muted-foreground">
          RoostNI is currently free in early beta for Northern Ireland landlords — no fees, no card
          required. This guide is general information, not legal advice; the authoritative source is{" "}
          <a
            href="https://www.communities-ni.gov.uk/articles/landlord-registration-scheme"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            the Department for Communities
          </a>{" "}
          and{" "}
          <a
            href="https://www.nidirect.gov.uk/articles/landlord-registration-process"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            nidirect
          </a>
          . Details checked September 2026.
        </p>
      </main>
    </div>
  );
}
