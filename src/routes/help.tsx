import { createFileRoute, Link } from "@tanstack/react-router";
import { LogoMark } from "@/components/logo";
import { Home, IdCard, MessageSquarePlus, LifeBuoy } from "lucide-react";

export const Route = createFileRoute("/help")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Help & FAQ — RoostNI Northern Ireland" },
      {
        name: "description",
        content:
          "How RoostNI works for tenants and landlords in Northern Ireland: tenant passports, applications, leases, deposits, Fair Fuel and notice periods.",
      },
      { property: "og:title", content: "Help & FAQ — RoostNI" },
      {
        property: "og:description",
        content:
          "Getting started guides and answers for tenants and landlords using RoostNI in Northern Ireland.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://roostni.co.uk/help" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://roostni.co.uk/help" }],
  }),
  component: HelpPage,
});

const TENANT_STEPS = [
  "Create your account and open your Tenant Passport.",
  "Add identity, income (including benefits) and references. Everything you upload is self-certified by you.",
  "Browse listings and apply with one tap — no re-typing your details for every property.",
  "Track applications, review and sign your lease, then manage the tenancy from your dashboard.",
];

const LANDLORD_STEPS = [
  "Create your account and add a property, including your NI Landlord Registration Number.",
  "Set rent, deposit, heating type and, for oil or LPG, your Fair Fuel terms.",
  "Review received passports — identity, income and affordability at a glance.",
  "Issue the lease, protect the deposit within 28 days, then run rent, inventory and repairs from the tenancy workspace.",
];

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "Do I need to register as a landlord in Northern Ireland?",
    a: (
      <>
        Yes — every private landlord must register with the Landlord Registration Scheme. It costs
        £70 online, lasts three years, and the register is public. Read our{" "}
        <Link
          to="/landlord-registration-ni"
          className="font-medium text-foreground underline underline-offset-4 hover:text-verified"
        >
          plain-English guide to landlord registration in NI
        </Link>
        .
      </>
    ),
  },
  {
    q: "What does “self-certified” mean?",
    a: "Documents and details on a Tenant Passport are uploaded and declared by the tenant themselves. RoostNI stores and presents them securely, but it does not run credit checks, employment checks or background checks. Landlords should read the evidence and make their own decision.",
  },
  {
    q: "Does RoostNI approve or reject anyone?",
    a: "No. RoostNI assists, it never decides. We organise the evidence, the paperwork and the deadlines — accepting or declining an applicant is always the landlord's call.",
  },
  {
    q: "How does Fair Fuel work for oil and LPG?",
    a: "Fair Fuel is a same-level-out policy. Whatever level the tank is at when the tenancy starts is the level it should be at when the tenancy ends. Full in means full out; empty in means empty out is accepted. Readings are recorded by both parties in the tenancy workspace.",
  },
  {
    q: "What is the 28-day deposit rule?",
    a: "In Northern Ireland a landlord must protect a tenancy deposit with an approved scheme within 28 days of receiving it and give the tenant the prescribed information. RoostNI counts the days down for you and stores the protection certificate against the tenancy.",
  },
  {
    q: "What notice periods apply?",
    a: "Notice to quit lengths depend on how long the tenant has lived in the property: 4 weeks for under 12 months, 8 weeks for 12 months to 10 years, and 12 weeks for over 10 years. RoostNI works the correct period out from the tenancy start date when you serve a notice.",
  },
  {
    q: "Who can see my documents?",
    a: "Only a landlord you have actively applied to, and only while that application is live. Withdraw an application and their access is revoked immediately.",
  },
  {
    q: "Is anything charged during the beta?",
    a: "No. Payments are switched off. Pricing is shown in the app for feedback only — nothing is taken from you and nothing is paid out.",
  },
  {
    q: "Should I use real documents?",
    a: "Please don't. Use test data during the beta. Never upload a real passport, payslip or anyone else's personal details.",
  },
];

function HelpPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70 bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/beta" className="flex items-center gap-2">
            <LogoMark />
            <span className="font-display text-base font-semibold tracking-tight">
              Roost<span className="text-verified">NI</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/beta"
              className="hidden rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground sm:inline"
            >
              About the beta
            </Link>
            <Link
              to="/auth" search={{ mode: "login" }}
              className="rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <LifeBuoy className="h-3.5 w-3.5" />
          Help centre
        </span>
        <h1 className="mt-5 max-w-3xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          How RoostNI works
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground">
          Short guides for both sides of a tenancy, plus answers to the questions we're
          asked most about renting in Northern Ireland.
        </p>

        <section className="mt-10 grid gap-4 sm:grid-cols-2">
          <GuideCard icon={IdCard} title="Getting started: tenants" steps={TENANT_STEPS} />
          <GuideCard icon={Home} title="Getting started: landlords" steps={LANDLORD_STEPS} />
        </section>

        <section className="mt-14">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Frequently asked questions
          </h2>
          <div className="mt-4 divide-y divide-border overflow-hidden rounded-3xl border border-border bg-surface shadow-resting">
            {FAQS.map((f) => (
              <details key={f.q} className="group p-5 sm:p-6">
                <summary className="cursor-pointer list-none font-medium text-foreground marker:hidden">
                  {f.q}
                </summary>
                <p className="mt-2.5 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-3xl border border-border bg-surface p-6 shadow-resting sm:p-8">
          <h2 className="font-display text-xl font-semibold tracking-tight">Still stuck?</h2>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Use the <span className="font-medium text-foreground">Feedback</span> button in
            the bottom corner of every signed-in page. It goes straight to the team and a
            one-line note is genuinely useful — tell us what you were trying to do and what
            happened instead.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 text-sm text-foreground">
            <MessageSquarePlus className="h-4 w-4 text-verified" />
            We read every message during the beta.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/auth" search={{ mode: "login" }}
              className="inline-flex items-center justify-center rounded-full bg-foreground px-5 py-2.5 font-display text-sm font-semibold text-[var(--color-primary-foreground)] shadow-raised transition hover:bg-foreground/92"
            >
              Sign in to RoostNI
            </Link>
            <Link
              to="/beta"
              className="inline-flex items-center justify-center rounded-full border border-border bg-surface px-5 py-2.5 font-display text-sm font-semibold text-foreground transition hover:bg-secondary"
            >
              Read the beta brief
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/70 py-8">
        <p className="mx-auto w-full max-w-5xl px-4 text-xs text-muted-foreground sm:px-6">
          RoostNI — built for Northern Ireland. RoostNI assists, it never decides.
        </p>
      </footer>
    </div>
  );
}

function GuideCard({
  icon: Icon,
  title,
  steps,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  steps: string[];
}) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-6 shadow-resting">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-surface-muted">
        <Icon className="h-5 w-5 text-foreground" />
      </span>
      <h2 className="mt-4 font-display text-lg font-semibold tracking-tight">{title}</h2>
      <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
        {steps.map((s, i) => (
          <li key={s} className="flex gap-2.5">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-surface-muted text-[11px] font-semibold text-foreground">
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}
