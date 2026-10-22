import { APPROVED_LINE, SHORT_LINES } from "@/lib/plans-copy";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LogoMark } from "@/components/logo";
import {
  ClipboardCheck,
  IdCard,
  Home,
  ShieldCheck,
  FileSignature,
  Wrench,
  MessageSquarePlus,
} from "lucide-react";

export const Route = createFileRoute("/beta")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "About RoostNI — Northern Ireland Renting, Direct" },
      {
        name: "description",
        content:
          "Help test RoostNI, Northern Ireland's direct renting platform. Tenant passports, compliant listings and full tenancy management — built around NI law.",
      },
      { property: "og:title", content: "About RoostNI — Northern Ireland Renting, Direct" },
      {
        property: "og:description",
        content:
          "Test RoostNI before launch: tenant passports for renters, compliant listings and tenancy management for landlords across Northern Ireland.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://roostni.co.uk/beta" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://roostni.co.uk/beta" }],
  }),
  component: BetaPage,
});

function BetaPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70 bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <span className="flex items-center gap-2">
            <LogoMark />
            <span className="font-display text-base font-semibold tracking-tight">
              Roost<span className="text-verified">NI</span>
            </span>
          </span>
          <div className="flex items-center gap-2">
            <Link
              to="/help"
              className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
            >
              Help & FAQ
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
        <span className="inline-flex items-center gap-2 rounded-full border border-verified/30 bg-verified-soft/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
          {SHORT_LINES.coreFree} · {SHORT_LINES.noCommission}
        </span>
        <h1 className="mt-5 max-w-3xl font-display text-3xl font-semibold tracking-tight sm:text-5xl">
          Renting in Northern Ireland, direct between tenant and landlord.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
          RoostNI gives renters a self-certified Tenant Passport and gives self-managing
          landlords everything a tenancy needs — listings, applications, leases, deposits,
          rent and repairs — with Northern Ireland's rules built in. You're here early:
          your job is to break it and tell us where it hurts.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/auth"
            search={{ role: "tenant" }}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 font-display text-sm font-semibold text-[var(--color-primary-foreground)] shadow-raised transition hover:bg-foreground/92"
          >
            <IdCard className="h-4 w-4" />
            I'm a tenant
          </Link>
          <Link
            to="/auth"
            search={{ role: "landlord" }}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface px-6 py-3 font-display text-sm font-semibold text-foreground shadow-resting transition hover:bg-secondary"
          >
            <Home className="h-4 w-4" />
            I'm a landlord
          </Link>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
          <span>
            Want to look first?{" "}
            <Link to="/listings" className="font-medium text-foreground underline-offset-4 hover:underline">
              Browse example listings
            </Link>
            .
          </span>
          <Link
            to="/audit"
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 font-display text-xs font-semibold text-[var(--color-primary-foreground)] shadow-raised transition hover:bg-foreground/92"
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
            Run Free Landlord Audit
          </Link>
        </div>


        <section className="mt-14 grid gap-4 sm:grid-cols-2">
          <PathCard
            icon={IdCard}
            title="Tenants: build your passport"
            steps={[
              "Create an account and open your Tenant Passport.",
              "Add identity, income (including benefits) and references.",
              "Browse listings and apply with one tap — no re-typing.",
              "Track applications, sign your lease and manage the tenancy.",
            ]}
          />
          <PathCard
            icon={Home}
            title="Landlords: list and let"
            steps={[
              "Create an account and add a property with your NI registration number.",
              "Set rent, deposit, heating and Fair Fuel terms.",
              "Review received passports and affordability at a glance.",
              "Issue the lease, protect the deposit and run the tenancy.",
            ]}
          />
        </section>

        <section className="mt-12">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            What we'd most like you to test
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Tile
              icon={ShieldCheck}
              title="Passport & screening"
              body="Does uploading documents and sharing them with a landlord feel safe and clear?"
            />
            <Tile
              icon={FileSignature}
              title="Lease & deposit"
              body="Issue, sign, counter-sign, then protect the deposit inside the 28-day window."
            />
            <Tile
              icon={Wrench}
              title="Living in it"
              body="Rent ledger, inventory, Fair Fuel readings, repairs and ending a tenancy."
            />
          </div>
        </section>

        <section className="mt-12 rounded-3xl border border-border bg-surface p-6 shadow-resting sm:p-8">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            How RoostNI works
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Your data, your control.</span> Only
              upload your own documents, and withdraw access whenever you choose.
            </li>
            <li>
              <span className="font-medium text-foreground">Nothing is charged.</span>{" "}
              Core direct management is free. Optional paid tools shown in the app are previews of future features.
            </li>
            <li>
              <span className="font-medium text-foreground">RoostNI assists, it never decides.</span>{" "}
              Documents are self-certified by the tenant; RoostNI does not run background checks
              or approve anyone on a landlord's behalf.
            </li>
            <li>
              <span className="font-medium text-foreground">Tell us everything.</span> Use the
              Feedback button in the bottom corner of every signed-in page.
            </li>
          </ul>
          <p className="mt-5 inline-flex items-center gap-2 text-sm text-foreground">
            <MessageSquarePlus className="h-4 w-4 text-verified" />
            Feedback goes straight to the team — a one-line note is genuinely useful.
          </p>
        </section>

        <div className="mt-12 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <Link
            to="/auth"
            search={{ role: "tenant" }}
            className="inline-flex items-center justify-center rounded-full bg-foreground px-6 py-3 font-display text-sm font-semibold text-[var(--color-primary-foreground)] shadow-raised transition hover:bg-foreground/92"
          >
            Create your free account
          </Link>
          <span className="text-sm text-muted-foreground">
            Takes about two minutes. You can switch roles later by signing up again.
          </span>
        </div>
      </main>

      <footer className="border-t border-border/70 py-8">
        <p className="mx-auto w-full max-w-5xl px-4 text-xs text-muted-foreground sm:px-6">
          RoostNI — built for Northern Ireland. {APPROVED_LINE}{" "}<Link to="/how-roostni-is-funded" className="underline hover:text-foreground">How RoostNI is funded</Link>
        </p>
      </footer>
    </div>
  );
}

function PathCard({
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
      <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">{title}</h3>
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

function Tile({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-resting">
      <Icon className="h-4 w-4 text-verified" />
      <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}