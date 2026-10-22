import { createFileRoute, Link } from "@tanstack/react-router";
import { LogoMark } from "@/components/logo";
import { APPROVED_LINE, PERMANENTLY_FREE } from "@/lib/plans-copy";

const TITLE = "How RoostNI is funded — straight answers about money | RoostNI";
const DESC =
  "What stays free on RoostNI permanently, why compliance tools are never paywalled, and how any optional paid extras would work in future. No commission on rent, never any fees for tenants.";

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

        <section className="mt-14">
          <h2 className="text-2xl font-extrabold sm:text-3xl">What stays free, permanently</h2>
          <ul className="mt-4 space-y-2 border-2 border-border p-5">
            {PERMANENTLY_FREE.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="font-mono font-bold text-verified">—</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-muted-foreground">These aren't trial features, and we won't take them away later.</p>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-extrabold sm:text-3xl">The law is never behind a paywall</h2>
          <p className="mt-4 leading-relaxed">
            If a tool helps you meet your legal duties in Northern Ireland, it stays free. That includes anything
            that produces a notice, receipt, reminder or record you need to keep. You'll never have to pay to
            stay compliant.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-extrabold sm:text-3xl">What might cost money in future</h2>
          <p className="mt-4 leading-relaxed">
            We may add optional extras later on. Examples include tools for landlords with five or more
            properties, or help from trusted local providers. If we do:
          </p>
          <ul className="mt-4 list-disc space-y-1 pl-6">
            <li>they'll always be opt-in, and you'll never be moved onto them automatically</li>
            <li>the price will be clear before you choose</li>
            <li>they'll be paid for by landlords or by the outside providers involved</li>
            <li>we'll never take a percentage of your rent</li>
            <li>tenants will never be charged a fee to apply or to use RoostNI</li>
          </ul>
          <p className="mt-4 font-bold">None of these extras are available today. Nothing is charged right now.</p>
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
            <a href="mailto:support@roostni.co.uk" className="font-bold underline">support@roostni.co.uk</a>. A real
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
