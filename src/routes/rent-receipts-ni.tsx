import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, Printer, ReceiptText, Scale, ShieldAlert } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { posthog } from "@/integrations/posthog/client";
import { getEventContext } from "@/lib/utm-session";

const PAGE_URL = "https://roostni.co.uk/rent-receipts-ni";
const TITLE = "Rent Receipts in Northern Ireland: landlord rules & free generator — RoostNI";
const DESC =
  "Northern Ireland landlords must give a free written receipt for rent paid in cash. What the law requires, what a receipt should contain, and a free printable rent receipt generator.";

const FAQ = [
  {
    q: "Do I have to give a rent receipt in Northern Ireland?",
    a: "Yes, when rent is paid in cash. The Private Tenancies Act (Northern Ireland) 2022 requires landlords to provide a written receipt for any rent payment made in cash, and it must be provided free of charge.",
  },
  {
    q: "What about bank transfers or standing orders?",
    a: "The legal duty covers cash payments, because bank payments already leave a record. Even so, providing a receipt for every payment is good practice — it prevents disputes about what was paid and when.",
  },
  {
    q: "What should a rent receipt include?",
    a: "The amount paid, the date it was paid, the period the payment covers, the property address, and the names of the landlord and tenant. Sign or initial it, and keep a copy.",
  },
  {
    q: "What happens if a landlord refuses to give a receipt?",
    a: "Failing to provide a receipt for a cash payment is an offence, and the district council can take enforcement action. Tenants can report it to their local council's environmental health or private tenancies team.",
  },
  {
    q: "How long should I keep receipts?",
    a: "Keep copies for the whole tenancy and for several years afterwards — they're your evidence if there's ever a dispute about rent arrears or a deposit deduction.",
  },
];

export const Route = createFileRoute("/rent-receipts-ni")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: "Rent receipts in Northern Ireland — landlord rules and free generator" },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:image", content: "https://roostni.co.uk/og/rent-receipts-ni.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://roostni.co.uk/og/rent-receipts-ni.jpg" },
      { property: "og:url", content: PAGE_URL },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          image: "https://roostni.co.uk/og/rent-receipts-ni.jpg",
          headline: "Rent receipts in Northern Ireland: what landlords must provide",
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
            { "@type": "ListItem", position: 2, name: "Rent Receipts NI", item: PAGE_URL },
          ],
        }),
      },
    ],
  }),
  component: RentReceiptsGuide,
});

function ReceiptGenerator() {
  const [landlord, setLandlord] = useState("");
  const [tenant, setTenant] = useState("");
  const [property, setProperty] = useState("");
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState("");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [method, setMethod] = useState("Cash");

  const ready = useMemo(
    () => landlord.trim() && tenant.trim() && amount.trim() && paidOn,
    [landlord, tenant, amount, paidOn],
  );

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <section className="mt-10 rounded-3xl border border-border bg-surface p-6 shadow-resting sm:p-8">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-surface-muted">
          <ReceiptText className="h-5 w-5 text-foreground" />
        </span>
        <h2 className="font-display text-xl font-semibold tracking-tight">Free rent receipt generator</h2>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Fill in the details, then print or save the receipt as a PDF. Nothing is uploaded — it all
        happens in your browser.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Landlord name
          <input className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={landlord} onChange={(e) => setLandlord(e.target.value)} />
        </label>
        <label className="text-sm font-medium">
          Tenant name
          <input className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={tenant} onChange={(e) => setTenant(e.target.value)} />
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          Property address
          <input className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={property} onChange={(e) => setProperty(e.target.value)} />
        </label>
        <label className="text-sm font-medium">
          Amount paid (£)
          <input type="number" min="0" step="0.01" className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className="text-sm font-medium">
          Date paid
          <input type="date" className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
        </label>
        <label className="text-sm font-medium">
          Period from
          <input type="date" className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} />
        </label>
        <label className="text-sm font-medium">
          Period to
          <input type="date" className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} />
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          Payment method
          <select className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option>Cash</option>
            <option>Bank transfer</option>
            <option>Standing order</option>
            <option>Cheque</option>
            <option>Other</option>
          </select>
        </label>
      </div>

      {ready && (
        <div className="mt-6 rounded-2xl border border-border bg-surface-muted/60 p-5" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Rent receipt</p>
          <p className="mt-3 text-sm leading-relaxed">
            Received from <strong>{tenant}</strong> the sum of <strong>£{Number(amount).toFixed(2)}</strong>,
            paid by {method.toLowerCase()} on <strong>{fmtDate(paidOn)}</strong>
            {periodFrom && periodTo && (
              <>
                , covering rent for the period <strong>{fmtDate(periodFrom)}</strong> to{" "}
                <strong>{fmtDate(periodTo)}</strong>
              </>
            )}
            {property && (
              <>
                , for the property at <strong>{property}</strong>
              </>
            )}
            .
          </p>
          <p className="mt-3 text-sm">Signed: ____________________ &nbsp; ({landlord}, landlord)</p>
          <button
            type="button"
            onClick={() => window.print()}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-medium transition hover:bg-secondary"
          >
            <Printer className="h-3.5 w-3.5" /> Print or save as PDF
          </button>
        </div>
      )}
    </section>
  );
}

function RentReceiptsGuide() {
  const track = (cta: string) =>
    posthog.capture("seo_guide_cta", { page: "rent-receipts-ni", cta, ...getEventContext() });

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
          <Link to="/auth" search={{ mode: "login" }} className="rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium transition hover:bg-secondary">
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <ReceiptText className="h-3.5 w-3.5" />
          Guide · Northern Ireland
        </span>
        <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Rent receipts in Northern Ireland: the rules every landlord should know
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          Under the Private Tenancies Act (Northern Ireland) 2022, landlords must give a written
          receipt for any rent paid in cash — free of charge. Here's what the law requires, what a
          good receipt contains, and a free generator to make one in seconds.
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
              ["Cash", "A written receipt is legally required for rent paid in cash"],
              ["Free", "The receipt must be provided at no charge"],
              ["Offence", "Refusing or failing to give one can bring council enforcement"],
            ].map(([w, l]) => (
              <div key={l} className="rounded-2xl border border-border bg-surface-muted/60 p-4">
                <p className="font-display text-2xl font-semibold">{w}</p>
                <p className="mt-1 text-xs text-muted-foreground">{l}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            The receipt duty exists because cash leaves no trail. A dated, signed receipt protects
            both sides: the tenant can prove they paid, and the landlord can prove exactly what was
            received and which period it covered.
          </p>
        </section>

        <ReceiptGenerator />

        <section className="mt-6 rounded-3xl border border-border bg-surface p-6 shadow-resting sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-surface-muted">
              <ShieldAlert className="h-5 w-5 text-foreground" />
            </span>
            <h2 className="font-display text-xl font-semibold tracking-tight">Common mistakes</h2>
          </div>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            {[
              "Taking cash and giving nothing in writing — that's the exact situation the law targets.",
              "Writing a receipt with no date or no period covered, making it useless in a dispute.",
              "Keeping no copy for yourself — a receipt only protects you if you can produce it later.",
              "Assuming a rent book entry the landlord keeps at home counts — the tenant needs their own record.",
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
          <h2 className="font-display text-xl font-semibold tracking-tight">Never chase a paper trail again</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            RoostNI's Rent Ledger records every payment against the tenancy automatically — amounts,
            dates and periods covered — so a complete, dated receipt history is always one tap away.
            Free during the beta.
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
          General information only, not legal advice. Rules can change and individual circumstances
          differ — check the current position on{" "}
          <a href="https://www.communities-ni.gov.uk/articles/section-1-2-private-tenancies-northern-ireland-act-2022" target="_blank" rel="noreferrer" className="underline underline-offset-4">
            the Department for Communities guidance
          </a>{" "}
          and nidirect.gov.uk, or speak to a solicitor. See also our{" "}
          <Link to="/notice-to-quit-ni" className="underline underline-offset-4">notice to quit guide</Link>,{" "}
          <Link to="/tenancy-information-notice-ni" className="underline underline-offset-4">Tenancy Information Notice guide</Link> and{" "}
          <Link to="/landlord-registration-ni" className="underline underline-offset-4">landlord registration guide</Link>.
        </p>
      </main>
    </div>
  );
}
