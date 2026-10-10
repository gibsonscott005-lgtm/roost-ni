import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, CalendarClock, ClipboardList, FileText, ShieldAlert, Scale } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { posthog } from "@/integrations/posthog/client";
import { getEventContext } from "@/lib/utm-session";

const PAGE_URL = "https://roostni.co.uk/tenancy-information-notice-ni";
const TITLE = "Tenancy Information Notice (Northern Ireland): rules & deadline — RoostNI";
const DESC =
  "Every private landlord in Northern Ireland must give tenants a Tenancy Information Notice within 28 days, free of charge. What it must contain, the Notice of Variation rules, and a free deadline calculator.";

const FAQ = [
  {
    q: "What is a Tenancy Information Notice?",
    a: "A written notice every private landlord in Northern Ireland must give the tenant within 28 days of granting the tenancy. It sets out the rent, deposit details, tenancy duration, repair responsibilities and the landlord's (and any agent's) contact details. It was introduced by the Private Tenancies Act (Northern Ireland) 2022.",
  },
  {
    q: "Is there an official template?",
    a: "Yes. The Department for Communities publishes a Tenancy Information Notice template, and the information it must contain is prescribed by the Tenancy Information Regulations (Northern Ireland) 2023. The notice must be provided free of charge.",
  },
  {
    q: "What if something changes during the tenancy?",
    a: "The landlord must give the tenant a Notice of Variation, free of charge, within 28 days of the change — for example a new landlord contact number or a change to the rent arrangements.",
  },
  {
    q: "Does this apply to tenancies that started before the Act?",
    a: "Tenants still in a private tenancy on 1 April 2023 who should have received a notice under the old rules must be given a free notice regarding past matters and any variation.",
  },
  {
    q: "What happens if a landlord doesn't provide one?",
    a: "Failing to provide the notice is an offence and the district council can take enforcement action. Keeping dated copies of what was given, and when, is the simplest protection.",
  },
];

export const Route = createFileRoute("/tenancy-information-notice-ni")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: "Tenancy Information Notice in Northern Ireland — rules and deadline" },
      { property: "og:description", content: DESC },
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
          headline: "Tenancy Information Notice in Northern Ireland: what landlords must provide",
          description: DESC,
          author: { "@type": "Organization", name: "RoostNI" },
          publisher: { "@type": "Organization", name: "RoostNI" },
          datePublished: "2026-10-10",
          dateModified: "2026-10-10",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "RoostNI", item: "https://roostni.co.uk/" },
            { "@type": "ListItem", position: 2, name: "Tenancy Information Notice NI", item: PAGE_URL },
          ],
        }),
      },
    ],
  }),
  component: TenancyInformationNoticeGuide,
});

function fmt(d: Date) {
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function DeadlineCalculator() {
  const [granted, setGranted] = useState("");

  const result = useMemo(() => {
    if (!granted) return null;
    const g = new Date(granted);
    if (isNaN(g.getTime())) return null;
    const deadline = new Date(g);
    deadline.setDate(deadline.getDate() + 28);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / 86400000);
    return { deadline, daysLeft };
  }, [granted]);

  return (
    <section className="mt-10 rounded-3xl border border-border bg-surface p-6 shadow-resting sm:p-8">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-surface-muted">
          <CalendarClock className="h-5 w-5 text-foreground" />
        </span>
        <h2 className="font-display text-xl font-semibold tracking-tight">28-day deadline calculator</h2>
      </div>
      <div className="mt-5 max-w-xs">
        <label className="text-sm font-medium">
          Date the tenancy was granted
          <input
            type="date"
            className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            value={granted}
            onChange={(e) => setGranted(e.target.value)}
          />
        </label>
      </div>
      <div className="mt-5 rounded-2xl border border-border bg-surface-muted/60 p-4 text-sm" aria-live="polite">
        {result ? (
          <>
            <p className="text-muted-foreground">The Tenancy Information Notice must be with the tenant by:</p>
            <p className="mt-2 font-display text-2xl font-semibold">{fmt(result.deadline)}</p>
            <p className="mt-1 text-muted-foreground">
              {result.daysLeft > 0
                ? `That's ${result.daysLeft} day${result.daysLeft === 1 ? "" : "s"} from today.`
                : result.daysLeft === 0
                  ? "That's today."
                  : `That deadline passed ${-result.daysLeft} day${result.daysLeft === -1 ? "" : "s"} ago — provide the notice as soon as possible and keep a dated copy.`}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              A calculation based on the 28-day requirement in the Private Tenancies Act (Northern Ireland) 2022.
              The same 28-day clock applies to a Notice of Variation when any of the information changes.
            </p>
          </>
        ) : (
          <p className="text-muted-foreground">Enter the tenancy start date to see the notice deadline.</p>
        )}
      </div>
    </section>
  );
}

function TenancyInformationNoticeGuide() {
  const track = (cta: string) =>
    posthog.capture("seo_guide_cta", { page: "tenancy-information-notice-ni", cta, ...getEventContext() });

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
          <Link to="/auth" className="rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium transition hover:bg-secondary">
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
          The Tenancy Information Notice: what every NI landlord must give tenants
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          Since the Private Tenancies Act (Northern Ireland) 2022, every private landlord here must give
          their tenant a Tenancy Information Notice within 28 days of granting the tenancy — free of charge.
          Here's what it must contain, and what happens when the details change.
        </p>

        <section className="mt-10 rounded-3xl border border-border bg-surface p-6 shadow-resting sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-surface-muted">
              <Scale className="h-5 w-5 text-foreground" />
            </span>
            <h2 className="font-display text-xl font-semibold tracking-tight">The rules in short</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              ["28 days", "To give the notice after granting the tenancy"],
              ["Free", "The notice must be provided at no charge"],
              ["28 days", "To give a Notice of Variation after any change"],
            ].map(([w, l]) => (
              <div key={l} className="rounded-2xl border border-border bg-surface-muted/60 p-4">
                <p className="font-display text-2xl font-semibold">{w}</p>
                <p className="mt-1 text-xs text-muted-foreground">{l}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            The notice exists to put both sides' rights and responsibilities in writing — rent, deposit,
            duration, repairs and contact details — so disputes are less likely later.
          </p>
        </section>

        <DeadlineCalculator />

        <section className="mt-6 rounded-3xl border border-border bg-surface p-6 shadow-resting sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-surface-muted">
              <ClipboardList className="h-5 w-5 text-foreground" />
            </span>
            <h2 className="font-display text-xl font-semibold tracking-tight">What the notice must cover</h2>
          </div>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            {[
              "The rent payable and when it's due",
              "Deposit details, including the amount and how it's protected",
              "The duration of the tenancy",
              "Who is responsible for which repairs",
              "Notice of termination arrangements",
              "The landlord's contact details — and the agent's, if there is one",
            ].map((m) => (
              <li key={m} className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-verified" />
                {m}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            The exact content is prescribed by the Tenancy Information Regulations (Northern Ireland) 2023,
            and the Department for Communities publishes an official template to complete.
          </p>
        </section>

        <section className="mt-6 rounded-3xl border border-border bg-surface p-6 shadow-resting sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-surface-muted">
              <ShieldAlert className="h-5 w-5 text-foreground" />
            </span>
            <h2 className="font-display text-xl font-semibold tracking-tight">Common mistakes</h2>
          </div>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            {[
              "Assuming the tenancy agreement alone is enough — the notice is a separate legal requirement.",
              "Missing the 28-day window because the paperwork was left until after move-in.",
              "Forgetting the Notice of Variation when a phone number, rent arrangement or other detail changes.",
              "Keeping no dated copy, so there's no evidence the notice was ever given.",
            ].map((m) => (
              <li key={m} className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-verified" />
                {m}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6 rounded-3xl border border-border bg-surface p-6 shadow-resting sm:p-8">
          <h2 className="font-display text-xl font-semibold tracking-tight">Questions landlords ask</h2>
          <div className="mt-4 space-y-4">
            {FAQ.map((f) => (
              <div key={f.q}>
                <h3 className="text-sm font-semibold">{f.q}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-verified/30 bg-surface p-6 shadow-resting sm:p-8">
          <h2 className="font-display text-xl font-semibold tracking-tight">Keep every tenancy's paperwork in one place</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            RoostNI's tenancy records keep each tenancy's key dates, documents and rent receipts together —
            so the 28-day deadlines and Notices of Variation never slip. Free during the beta.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/auth" onClick={() => track("signup")} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Try RoostNI free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/audit" onClick={() => track("audit")} className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-secondary">
              Free compliance check
            </Link>
          </div>
        </section>

        <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
          General information only, not legal advice. Rules can change and individual circumstances differ —
          check the current position on{" "}
          <a href="https://www.communities-ni.gov.uk/articles/section-1-2-private-tenancies-northern-ireland-act-2022" target="_blank" rel="noreferrer" className="underline underline-offset-4">
            the Department for Communities guidance
          </a>{" "}
          and nidirect.gov.uk, or speak to a solicitor. See also our{" "}
          <Link to="/notice-to-quit-ni" className="underline underline-offset-4">notice to quit guide</Link>,{" "}
          <Link to="/rent-receipts-ni" className="underline underline-offset-4">rent receipts guide</Link> and{" "}
          <Link to="/landlord-registration-ni" className="underline underline-offset-4">landlord registration guide</Link>.
        </p>
      </main>
    </div>
  );
}
