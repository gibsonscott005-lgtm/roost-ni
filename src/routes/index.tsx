import { APPROVED_LINE, BILLING_NOTE, SHORT_LINES } from "@/lib/plans-copy";
import { STANDARD_PLAN, FOUNDING_PLAN, FOUNDING_LANDLORD_LIMIT, formatGBP } from "@/lib/pricing";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LogoMark } from "@/components/logo";
import { posthog } from "@/integrations/posthog/client";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Renting Out a Property in Northern Ireland — Landlord Tools | RoostNI" },
      {
        name: "description",
        content:
          "For Northern Ireland landlords: notice to quit periods, the tenancy information notice, landlord registration and rent receipts — then list and manage your property direct. No commission on rent.",
      },
      { property: "og:title", content: "Renting Out a Property in Northern Ireland — Landlord Tools | RoostNI" },
      {
        property: "og:description",
        content:
          "For Northern Ireland landlords: notice to quit periods, the tenancy information notice, landlord registration and rent receipts — then list and manage your property direct. No commission on rent.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://roostni.co.uk" },
      { property: "og:image", content: "https://roostni.co.uk/og/roostni-preview.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "RoostNI — Renting in Northern Ireland, done direct" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Renting Out a Property in Northern Ireland — Landlord Tools | RoostNI" },
      {
        name: "twitter:description",
        content: "For Northern Ireland landlords: notice to quit periods, the tenancy information notice, landlord registration and rent receipts — then list and manage your property direct. No commission on rent.",
      },
      { name: "twitter:image", content: "https://roostni.co.uk/og/roostni-preview.jpg" },
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
                "Self-service platform for Northern Ireland private landlords and tenants: direct property listings, tenancy management with NI tenancy law built in, and a reusable self-certified Tenant Passport. Every tool is included at every level; landlords pay by the number of homes they manage, and billing is not switched on yet. Never any fees for tenants.",
              areaServed: { "@type": "AdministrativeArea", name: "Northern Ireland" },
              offers: { "@type": "Offer", name: "Standard", price: "7", priceCurrency: "GBP", description: APPROVED_LINE + " Billing is not switched on yet." },
              publisher: { "@id": "https://roostni.co.uk/#organization" },
            },
          ],
        }),
      },
    ],
  }),
  component: HomePage,
});

const TICKER = SHORT_LINES.ticker;

function HomePage() {
  const track = (target: string) => posthog.capture("home_cta_click", { target });
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="overflow-hidden border-b-2 border-foreground bg-verified py-2 text-verified-foreground">
        <div className="brutal-ticker flex w-max whitespace-nowrap font-mono text-sm font-bold uppercase tracking-wider">
          <span>{TICKER.repeat(4)}</span>
          <span aria-hidden>{TICKER.repeat(4)}</span>
        </div>
      </div>

      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <LogoMark />
            <span className="font-display text-xl font-extrabold tracking-tight">
              Roost<span className="text-verified">NI</span>
            </span>
          </Link>
          <nav className="flex items-center gap-4 font-mono text-sm font-bold uppercase">
            <Link to="/listings" className="text-muted-foreground hover:text-foreground">Browse</Link>
            <Link to="/blog" className="text-muted-foreground hover:text-foreground">Blog</Link>
            <Link to="/list-property" onClick={() => track("header_list")} className="hidden text-muted-foreground hover:text-foreground sm:inline">List</Link>
            <Link to="/help" className="hidden text-muted-foreground hover:text-foreground sm:inline">Help</Link>
            <Link to="/auth" search={{ mode: "login" }} className="whitespace-nowrap border-2 border-foreground px-3 py-1.5 hover:bg-foreground hover:text-background">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="pb-12 pt-12 sm:pt-20">
          <p className="inline-block -rotate-1 border-2 border-verified px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider text-verified sm:text-sm">
            // Direct rentals for Northern Ireland
          </p>
          <h1 className="mt-6 text-5xl font-extrabold leading-[0.95] sm:text-7xl lg:text-8xl">
            Renting out a property in Northern Ireland, done direct.
          </h1>
          <p className="mt-3 text-5xl font-extrabold leading-[0.95] text-muted-foreground sm:text-7xl lg:text-8xl">
            No middleman.
          </p>
          <div className="brutal-bubble mt-8 inline-block bg-verified px-6 py-4 text-verified-foreground">
            <p className="font-display text-5xl font-extrabold leading-none sm:text-7xl">No agency tax.</p>
          </div>

          <div className="brutal-bubble brutal-bubble-paper mt-12 max-w-2xl bg-paper p-6 text-paper-foreground sm:p-8">
            <p className="text-lg leading-relaxed sm:text-xl">
              Landlords: list, let and manage without the 10–12% + VAT agent cut. Renters: apply direct
              with one reusable Tenant Passport. Every step follows Northern Ireland law — not England's.
            </p>
          </div>

          <div className="brutal-bubble mt-10 max-w-2xl bg-verified p-5 text-verified-foreground">
            <p className="font-mono text-sm font-bold uppercase leading-relaxed tracking-wide sm:text-base">
              {APPROVED_LINE}
            </p>
          </div>
        </section>

        <section className="grid gap-8 pb-16 md:grid-cols-2">
          <AudienceCard
            n="01 / Tenants"
            title="How do I find a place to rent in NI without agent fees?"
            body="Cut out the WhatsApp chaos. Browse direct NI homes and apply with one Tenant Passport."
            to="/listings"
            onClick={() => track("tenant_browse")}
            tone="paper"
          />
          <AudienceCard
            n="02 / Landlords"
            title="How do I rent out my property in Northern Ireland?"
            body="List your home in minutes. Founding landlords get a month free. TIN and notice periods handled the NI way."
            to="/list-property"
            onClick={() => track("landlord_list")}
            tone="verified"
          />
        </section>
        <p className="-mt-4 mb-8 text-sm font-semibold">
          <Link to="/how-roostni-is-funded" className="underline">First 20 landlords to add a home: one month free, then £5 a month, locked for 24 months.</Link>
        </p>

        <section className="border-y-2 border-foreground py-8">
          {[
            ["0%", "Commission on your rent"],
            ["28 days", "TIN deadline, tracked for you"],
          ].map(([big, label], i) => (
            <div key={big} className={`py-8 ${i ? "border-t border-border" : ""}`}>
              <p className="font-display text-7xl font-extrabold leading-none text-verified sm:text-8xl">{big}</p>
              <p className="mt-5 inline-block border-2 border-foreground px-4 py-2 font-mono text-sm font-bold uppercase tracking-wide sm:text-base">
                {label}
              </p>
            </div>
          ))}
        </section>

        <section className="py-16">
          <p className="font-mono text-sm font-bold uppercase tracking-wider text-verified">// Free NI tools — no sign-up</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <ToolLink to="/audit" title="Do I need landlord registration in Northern Ireland?" />
            <ToolLink to="/notice-to-quit-ni" title="What is a notice to quit in Northern Ireland?" />
            <ToolLink to="/tenancy-information-notice-ni" title="What is a tenancy information notice?" />
            <ToolLink to="/rent-receipts-ni" title="Do I have to give a rent receipt for cash?" />
          </div>
        </section>

        <section className="border-t-2 border-foreground py-16">
          <p className="font-mono text-sm font-bold uppercase tracking-wider text-verified">// How it works for landlords</p>
          <ol className="mt-6 grid gap-3">
            {[
              "Add your home — vacant or already tenanted.",
              "Advertise it direct, or run your existing tenancy from RoostNI.",
              "Tenants apply with one Tenant Passport. You check the evidence yourself.",
              "Issue the lease and track your NI deadlines in one place.",
            ].map((step, i) => (
              <li key={step} className="flex gap-4 border-2 border-foreground p-4">
                <span className="font-display text-2xl font-extrabold text-verified">{i + 1}</span>
                <span className="self-center font-semibold">{step}</span>
              </li>
            ))}
          </ol>
          <Link
            to="/auth"
            search={{ role: "landlord", next: "/dashboard?add=tenanted" }}
            onClick={() => posthog.capture("move_tenanted_home_clicked", { source: "homepage" })}
            className="mt-6 inline-flex items-center gap-2 border-2 border-foreground bg-foreground px-5 py-3 font-bold text-background transition hover:bg-verified hover:border-verified"
          >
            Move a tenanted home to RoostNI <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">Already have a tenant? Add the home, keep the tenancy, run it from here. Not advertised.</p>
        </section>

        <section className="py-16">
          <p className="font-mono text-sm font-bold uppercase tracking-wider text-verified">// What it costs</p>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-2 border-foreground text-left">
              <thead className="bg-foreground text-background font-mono text-xs uppercase">
                <tr>
                  <th className="p-3"></th>
                  <th className="p-3">{STANDARD_PLAN.name}</th>
                  <th className="p-3">{FOUNDING_PLAN.name}</th>
                </tr>
              </thead>
              <tbody className="font-semibold">
                {[
                  ["First home, per month", STANDARD_PLAN.firstHomePence, FOUNDING_PLAN.firstHomePence],
                  ["Each extra home", STANDARD_PLAN.extraHomePence, FOUNDING_PLAN.extraHomePence],
                  ["Never more than, per month", STANDARD_PLAN.capPence, FOUNDING_PLAN.capPence],
                ].map(([label, s, f]) => (
                  <tr key={label as string} className="border-t border-border">
                    <td className="p-3">{label}</td>
                    <td className="p-3">{formatGBP(s as number)}</td>
                    <td className="p-3 text-verified">{formatGBP(f as number)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm font-semibold">
            Founding landlords are the first {FOUNDING_LANDLORD_LIMIT} landlords to add a home: {FOUNDING_PLAN.introMonths} month free from that day, then the founding price, locked for {FOUNDING_PLAN.lockMonths} months.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{SHORT_LINES.noCommissionSentence} {BILLING_NOTE}</p>
        </section>

        <section className="border-t-2 border-foreground py-16">
          <p className="font-mono text-sm font-bold uppercase tracking-wider text-verified">// Landlord questions</p>
          <div className="mt-6 grid gap-3">
            {[
              ["What must a landlord give a tenant in Northern Ireland?", "A Tenancy Information Notice, free of charge, within 28 days of the tenancy being granted."],
              ["How do tenancy deposits work in Northern Ireland?", "Protect the deposit in an approved scheme, TDS Northern Ireland or MyDeposits Northern Ireland, within 28 days of receiving it. Give the tenant the prescribed information within 35 days of receiving it."],
              ["How much notice to quit is needed in Northern Ireland?", "In Northern Ireland, a landlord must give a tenant at least 4 weeks' written notice to quit if the tenancy has lasted no more than 12 months. In Northern Ireland, a landlord must give a tenant at least 8 weeks' written notice to quit if the tenancy has lasted more than 12 months but no more than 10 years. In Northern Ireland, a landlord must give a tenant at least 12 weeks' written notice to quit if the tenancy has lasted more than 10 years. In Northern Ireland, a tenant must give their landlord at least 4 weeks' written notice to quit, or at least 12 weeks' if the tenancy has lasted more than 10 years."],
              ["Is there a limit on the deposit?", "A tenancy deposit must not exceed one month’s rent."],
              ["Do landlords have to give a receipt for cash rent?", "Yes. Every cash payment needs a receipt showing the amount, the date, what it was for and any balance outstanding."],
              ["What does RoostNI cost?", `${STANDARD_PLAN.name}: ${formatGBP(STANDARD_PLAN.firstHomePence)} a month for the first home, ${formatGBP(STANDARD_PLAN.extraHomePence)} for each extra, never more than ${formatGBP(STANDARD_PLAN.capPence)}. ${APPROVED_LINE} ${BILLING_NOTE}`],
              ["Does RoostNI vet or credit-check tenants?", "No. RoostNI organises the evidence an applicant gives, so you can check it directly. Tenants never pay anything."],
            ].map(([q, a]) => (
              <details key={q} className="border-2 border-foreground p-4">
                <summary className="cursor-pointer font-bold">{q}</summary>
                <p className="mt-3 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-foreground">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 font-mono text-xs uppercase text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} RoostNI — Northern Ireland only</p>
          <div className="flex flex-wrap gap-4">
            <Link to="/blog" className="hover:text-foreground">Blog</Link>
            <Link to="/help" className="hover:text-foreground">Help</Link>
            <Link to="/beta" className="hover:text-foreground">About</Link>
            <Link to="/how-roostni-is-funded" className="hover:text-foreground">How we're funded</Link>
            <Link to="/landlord-registration-ni" className="hover:text-foreground">Landlord registration</Link>
          </div>
        </div>
        <p className="mx-auto max-w-6xl px-4 pb-8 text-xs text-muted-foreground sm:px-6">
          RoostNI provides general information, not legal advice. Check current guidance at nidirect.gov.uk.
        </p>
      </footer>
    </div>
  );
}

function AudienceCard({ n, title, body, to, onClick, tone }: {
  n: string; title: string; body: string; to: "/listings" | "/list-property"; onClick: () => void; tone: "paper" | "verified";
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`brutal-bubble group block p-6 transition-transform hover:-translate-y-1 sm:p-8 ${
        tone === "paper" ? "brutal-bubble-paper bg-paper text-paper-foreground" : "bg-verified text-verified-foreground"
      }`}
    >
      <p className="font-mono text-sm font-bold uppercase">{n}</p>
      <h2 className="mt-3 text-4xl font-extrabold !text-current sm:text-5xl">{title}</h2>
      <div className="mt-4 flex items-end justify-between gap-4">
        <p className="text-lg font-bold leading-snug sm:text-xl">{body}</p>
        <ArrowRight className="h-6 w-6 shrink-0 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function ToolLink({ to, title }: { to: "/audit" | "/notice-to-quit-ni" | "/tenancy-information-notice-ni" | "/rent-receipts-ni"; title: string }) {
  return (
    <Link to={to} className="group flex items-center justify-between border-2 border-border p-5 font-display text-lg font-bold transition hover:border-verified hover:text-verified">
      {title}
      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}
