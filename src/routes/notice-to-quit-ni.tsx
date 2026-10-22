import { APPROVED_LINE, SHORT_LINES } from "@/lib/plans-copy";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, CalendarClock, FileText, ShieldAlert, Scale } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { posthog } from "@/integrations/posthog/client";
import { getEventContext } from "@/lib/utm-session";

const PAGE_URL = "https://roostni.co.uk/notice-to-quit-ni";
const TITLE = "Notice to Quit in Northern Ireland: Periods & Calculator — RoostNI";
const DESC =
  "How much notice a landlord must give in Northern Ireland: 4, 8 or 12 weeks depending on tenancy length. Free notice period calculator, plus why England's Section 21 doesn't apply here.";

const FAQ = [
  {
    q: "Does Section 21 apply in Northern Ireland?",
    a: "No. Section 21 and Section 8 are English law. In Northern Ireland a private tenancy is ended by a written notice to quit under the Private Tenancies (Northern Ireland) Order 2006, as amended by the Private Tenancies Act (Northern Ireland) 2022.",
  },
  {
    q: "How much notice must a landlord give?",
    a: "Since 5 May 2022: 4 weeks if the tenancy has lasted 12 months or less, 8 weeks if it has lasted more than 12 months but not more than 10 years, and 12 weeks if it has lasted more than 10 years.",
  },
  {
    q: "How much notice must a tenant give?",
    a: "A tenant must give at least 4 weeks' written notice, or 12 weeks where the tenancy has lasted more than 10 years.",
  },
  {
    q: "Does the notice have to be in writing?",
    a: "Yes. A notice to quit must be in writing. A text message or verbal conversation is not a valid notice.",
  },
  {
    q: "Can the tenant be made to leave when the notice ends?",
    a: "No. If the tenant doesn't leave when the notice expires, the landlord must apply to the court for a possession order. Removing a tenant without one can be an offence.",
  },
];

export const Route = createFileRoute("/notice-to-quit-ni")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: "Notice to quit in Northern Ireland — periods and free calculator" },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:image", content: "https://roostni.co.uk/og/notice-to-quit-ni.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://roostni.co.uk/og/notice-to-quit-ni.jpg" },
      { property: "og:url", content: PAGE_URL },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          image: "https://roostni.co.uk/og/notice-to-quit-ni.jpg",
          headline: "Notice to quit in Northern Ireland: notice periods and calculator",
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
            { "@type": "ListItem", position: 2, name: "Notice to quit NI", item: PAGE_URL },
          ],
        }),
      },
    ],
  }),
  component: NoticeToQuitGuide,
});

function weeksFor(who: "landlord" | "tenant", months: number) {
  if (who === "tenant") return months > 120 ? 12 : 4;
  if (months <= 12) return 4;
  if (months <= 120) return 8;
  return 12;
}

function fmt(d: Date) {
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function Calculator() {
  const today = new Date().toISOString().slice(0, 10);
  const [who, setWho] = useState<"landlord" | "tenant">("landlord");
  const [start, setStart] = useState("");
  const [served, setServed] = useState(today);

  const result = useMemo(() => {
    if (!start || !served) return null;
    const s = new Date(start);
    const v = new Date(served);
    if (isNaN(s.getTime()) || isNaN(v.getTime()) || v < s) return null;
    const months = (v.getFullYear() - s.getFullYear()) * 12 + (v.getMonth() - s.getMonth()) - (v.getDate() < s.getDate() ? 1 : 0);
    const weeks = weeksFor(who, months);
    const end = new Date(v);
    end.setDate(end.getDate() + weeks * 7);
    return { months, weeks, end };
  }, [who, start, served]);

  const field = "mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm";

  return (
    <section className="mt-10 border-2 border-border bg-surface p-6 shadow-raised sm:p-8">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-none bg-surface-muted">
          <CalendarClock className="h-5 w-5 text-foreground" />
        </span>
        <h2 className="font-display text-2xl font-extrabold tracking-tight">Notice period calculator</h2>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-medium">
          Who is giving notice?
          <select className={field} value={who} onChange={(e) => setWho(e.target.value as "landlord" | "tenant")}>
            <option value="landlord">Landlord</option>
            <option value="tenant">Tenant</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Tenancy start date
          <input type="date" className={field} value={start} max={served} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="text-sm font-medium">
          Date notice is given
          <input type="date" className={field} value={served} onChange={(e) => setServed(e.target.value)} />
        </label>
      </div>
      <div className="mt-5 rounded-none border-2 border-border bg-background p-4 shadow-raised text-sm" aria-live="polite">
        {result ? (
          <>
            <p className="text-muted-foreground">
              Tenancy length when notice is given: about{" "}
              <strong className="text-foreground">
                {Math.floor(result.months / 12)} years {result.months % 12} months
              </strong>
            </p>
            <p className="mt-2 font-display text-2xl font-semibold">{result.weeks} weeks' notice</p>
            <p className="mt-1 text-muted-foreground">
              Earliest end date (calculation): <strong className="text-foreground">{fmt(result.end)}</strong>
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              A calculation based on the notice periods in force since 5 May 2022. The 2022 Act allows for longer landlord notice periods in future, but these are not yet in force. It doesn't account for any
              longer period in your tenancy agreement or for how the notice is delivered — allow extra days if posting.
            </p>
          </>
        ) : (
          <p className="text-muted-foreground">Enter the tenancy start date to see the minimum notice period.</p>
        )}
      </div>
    </section>
  );
}

function NoticeToQuitGuide() {
  const track = (cta: string) => posthog.capture("seo_guide_cta", { page: "notice-to-quit-ni", cta, ...getEventContext() });

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
        <span className="inline-flex -rotate-2 items-center gap-2 border-2 border-background bg-verified px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest text-verified-foreground shadow-raised">
          <FileText className="h-3.5 w-3.5" />
          // Guide · Northern Ireland
        </span>
        <h1 className="mt-6 font-display text-4xl font-extrabold leading-[0.95] tracking-tight sm:text-6xl">
          Notice to quit in Northern Ireland: how much notice, and how to give it
        </h1>
        <p className="brutal-bubble brutal-bubble-paper mt-6 bg-paper px-4 py-3 text-base font-medium text-paper-foreground">
          Most notice-to-quit advice online is written for England. Northern Ireland has its own rules, and
          the current notice periods have applied since 5 May 2022. Here's what applies here, with a calculator to
          work out the dates.
        </p>

        <section className="mt-10 border-2 border-border bg-surface p-6 shadow-raised sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-none bg-surface-muted">
              <Scale className="h-5 w-5 text-foreground" />
            </span>
            <h2 className="font-display text-2xl font-extrabold tracking-tight">Landlord notice periods</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              ["4 weeks", "Tenancy of 12 months or less"],
              ["8 weeks", "More than 12 months, up to 10 years"],
              ["12 weeks", "More than 10 years"],
            ].map(([w, l]) => (
              <div key={w} className="rounded-none border-2 border-border bg-background p-4 shadow-raised">
                <p className="font-display text-3xl font-extrabold text-verified">{w}</p>
                <p className="mt-1 text-xs text-muted-foreground">{l}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Tenants must give at least <strong className="font-medium text-foreground">4 weeks</strong> (12 weeks
            after 10 years). Every notice to quit must be <strong className="font-medium text-foreground">in writing</strong>.
          </p>
        </section>

        <Calculator />

        <section className="mt-6 border-2 border-border bg-surface p-6 shadow-raised sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-none bg-surface-muted">
              <ShieldAlert className="h-5 w-5 text-foreground" />
            </span>
            <h2 className="font-display text-2xl font-extrabold tracking-tight">Common mistakes</h2>
          </div>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            {[
              "Using an English Section 21 or Section 8 template — they have no effect in Northern Ireland.",
              "Giving notice by text, phone or in conversation instead of in writing.",
              "Counting the tenancy length from the wrong date, so the notice is too short.",
              "Treating the end of the notice as permission to change the locks — only a court can order possession.",
            ].map((m) => (
              <li key={m} className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-verified" />
                {m}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6 border-2 border-border bg-surface p-6 shadow-raised sm:p-8">
          <h2 className="font-display text-2xl font-extrabold tracking-tight">Questions landlords ask</h2>
          <div className="mt-4 space-y-4">
            {FAQ.map((f) => (
              <div key={f.q}>
                <h3 className="text-sm font-semibold">{f.q}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 border-2 border-verified/30 bg-surface p-6 shadow-resting sm:p-8">
          <h2 className="font-display text-2xl font-extrabold tracking-tight">Are the rest of your tenancies in order?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Take the free five-question NI compliance check, or keep your tenancy records, notices and rent
            receipts in one place with RoostNI. {SHORT_LINES.coreFreeSentence}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/audit" onClick={() => track("audit")} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Free compliance check <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/auth" onClick={() => track("signup")} className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-secondary">
              Try RoostNI free
            </Link>
          </div>
        </section>

        <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
          General information only, not legal advice. Rules can change and individual circumstances differ —
          check the current position on{" "}
          <a href="https://www.communities-ni.gov.uk/articles/section-11-private-tenancies-northern-ireland-act-2022" target="_blank" rel="noreferrer" className="underline underline-offset-4">
            the Department for Communities guidance
          </a>{" "}
          and nidirect.gov.uk, or speak to a solicitor before serving notice. See also our{" "}
          <Link to="/tenancy-information-notice-ni" className="underline underline-offset-4">Tenancy Information Notice guide</Link>,{" "}
          <Link to="/rent-receipts-ni" className="underline underline-offset-4">rent receipts guide</Link> and{" "}
          <Link to="/landlord-registration-ni" className="underline underline-offset-4">landlord registration guide</Link>.
        </p>
      </main>
    </div>
  );
}
