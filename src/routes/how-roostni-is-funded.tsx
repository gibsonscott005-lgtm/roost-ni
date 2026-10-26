import { createFileRoute, Link } from "@tanstack/react-router";
import { LogoMark } from "@/components/logo";
import { APPROVED_LINE, BILLING_NOTE, STATUTORY_NOTE } from "@/lib/plans-copy";
import {
  ARCHIVE_UNCOUNT_MONTHS,
  FOUNDING_LANDLORD_LIMIT,
  FOUNDING_PLAN,
  STANDARD_PLAN,
  formatGBP,
  monthlyPence,
} from "@/lib/pricing";

const EXAMPLES = [1, 3, 10];

const TITLE = "How RoostNI is funded — straight answers about money | RoostNI";
const DESC =
  "RoostNI pricing for Northern Ireland landlords: every tool included, pay by the number of homes you manage, no commission on rent, never any fees for tenants. Billing is not switched on yet.";

export const Route = createFileRoute("/how-roostni-is-funded")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: "How RoostNI is funded" },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://roostni.co.uk/how-roostni-is-funded" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "How RoostNI is funded" },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: "https://roostni.co.uk/how-roostni-is-funded" }],
  }),
  component: FundingPage,
});

function FundingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <LogoMark />
            <span className="font-display text-xl font-extrabold tracking-tight">
              Roost<span className="text-verified">NI</span>
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="inline-block -rotate-1 border-2 border-verified px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider text-verified">
          // How RoostNI is funded
        </p>
        <h1 className="mt-6 text-4xl font-extrabold leading-[0.95] sm:text-6xl">Straight answers about money.</h1>
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
          RoostNI is built in Northern Ireland for landlords and tenants who'd rather deal with each other
          directly. We think you should know exactly how a service like this pays its way, so here it is in
          plain English.
        </p>

        <div className="brutal-bubble mt-10 bg-verified p-5 text-verified-foreground">
          <p className="font-display text-xl font-extrabold leading-snug sm:text-2xl">{APPROVED_LINE}</p>
        </div>

        <p className="mt-6 border-2 border-border p-4 font-bold">{BILLING_NOTE}</p>

        <section className="mt-14 grid gap-6 sm:grid-cols-2">
          <div className="border-2 border-border p-5">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">// Standard</p>
            <p className="mt-3 text-3xl font-extrabold">{formatGBP(STANDARD_PLAN.firstHomePence)} a month</p>
            <ul className="mt-4 space-y-1">
              <li>for your first home</li>
              <li>plus {formatGBP(STANDARD_PLAN.extraHomePence)} for each extra home</li>
              <li>never more than {formatGBP(STANDARD_PLAN.capPence)} a month</li>
            </ul>
          </div>
          <div className="border-2 border-verified p-5">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-verified">// Founding landlords</p>
            <p className="mt-3 text-3xl font-extrabold">{formatGBP(FOUNDING_PLAN.firstHomePence)} a month</p>
            <ul className="mt-4 space-y-1">
              <li>for the first {FOUNDING_LANDLORD_LIMIT} landlords who list a property</li>
              <li>one month free from the day you list</li>
              <li>then {formatGBP(FOUNDING_PLAN.firstHomePence)} first home, plus {formatGBP(FOUNDING_PLAN.extraHomePence)} each extra</li>
              <li>never more than {formatGBP(FOUNDING_PLAN.capPence)} a month</li>
              <li>price locked for {FOUNDING_PLAN.lockMonths} months</li>
            </ul>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-extrabold sm:text-3xl">What it works out at</h2>
          <table className="mt-4 w-full border-2 border-border text-left">
            <thead className="font-mono text-xs uppercase tracking-wider">
              <tr><th className="p-3">Homes</th><th className="p-3">Standard</th><th className="p-3">Founding</th></tr>
            </thead>
            <tbody>
              {EXAMPLES.map((n) => (
                <tr key={n} className="border-t-2 border-border">
                  <td className="p-3 font-bold">{n}</td>
                  <td className="p-3 tabular-nums">{formatGBP(monthlyPence(n, STANDARD_PLAN))}</td>
                  <td className="p-3 tabular-nums">{formatGBP(monthlyPence(n, FOUNDING_PLAN))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-extrabold sm:text-3xl">How a home is counted</h2>
          <p className="mt-4 leading-relaxed">
            By address. A home stays counted until it is sold, or until it has been archived for{" "}
            {ARCHIVE_UNCOUNT_MONTHS} months. Every tool is included whatever number you have.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-extrabold sm:text-3xl">What never costs anything</h2>
          <ul className="mt-4 list-disc space-y-1 pl-6">
            <li>{STATUTORY_NOTE}</li>
            <li>Never any fees for tenants: not to apply, not for a Tenant Passport, not for an identity check.</li>
            <li>No commission on rent, ever.</li>
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Referrals</h2>
          <p className="mt-4 leading-relaxed">
            If we ever recommend a tradesperson, insurer or other provider and they pay us for that
            introduction, we'll say so clearly beside the recommendation. Your Tenant Passport details are never
            shared for marketing or referrals without your clear permission.
          </p>
        </section>

        <div className="brutal-bubble brutal-bubble-paper mt-12 bg-paper p-6 text-paper-foreground">
          <p className="font-display text-xl font-extrabold">Questions?</p>
          <p className="mt-2">
            If something here isn't clear, email{" "}
            <a href="mailto:scott@roostni.co.uk" className="font-bold underline">scott@roostni.co.uk</a>. A real
            person in Northern Ireland will reply.
          </p>
        </div>

        <p className="mt-12 text-xs text-muted-foreground">
          RoostNI provides general information, not legal advice. Check current guidance at nidirect.gov.uk.
        </p>
      </main>
    </div>
  );
}
