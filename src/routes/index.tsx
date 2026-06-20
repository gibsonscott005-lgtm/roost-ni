import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ViewSwitcher } from "../components/view-switcher";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  Bell,
  ChevronDown,
  ShieldCheck,
  BadgeCheck,
  IdCard,
  Banknote,
  UserRoundCheck,
  Home,
  Flame,
  MapPin,
  BedDouble,
  PoundSterling,
  CalendarDays,
  Share2,
  Lock,
  Sparkles,
  Pencil,
  Clock,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tenant Passport — Roost NI" },
      {
        name: "description",
        content:
          "Your verified Tenant Passport for Northern Ireland. Share trusted ID, income and references with landlords in one tap.",
      },
      { property: "og:title", content: "Tenant Passport — Roost NI" },
      {
        property: "og:description",
        content:
          "Verified ID, income and references in one secure passport. Built for renters in Northern Ireland.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, profile } = useAuth();
  const [livePassport, setLivePassport] = useState<LivePassport | null>(null);

  useEffect(() => {
    if (!user || (profile && profile.account_type !== "tenant")) {
      setLivePassport(null);
      return;
    }
    supabase
      .from("tenant_passports")
      .select(
        "identity_verified, income_verified, reference_verified, right_to_rent_verified, monthly_income_net, id_document_type, employment_status, previous_landlord_name",
      )
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setLivePassport((data as LivePassport | null) ?? null));
  }, [user, profile]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 pb-32 pt-6 sm:px-6 sm:pt-10">
        <ViewSwitcher />
        <PageIntro name={profile?.full_name?.split(" ")[0] ?? "there"} signedIn={!!user} />
        <PassportStatusCard passport={livePassport} signedIn={!!user} />
        <SectionHeading
          eyebrow="Core credentials"
          title="Your verified record"
          hint="All checks completed within the last 30 days."
        />
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <IdentityCard passport={livePassport} />
          <IncomeCard passport={livePassport} />
          <ReferenceCard passport={livePassport} />
        </div>
        <SectionHeading
          eyebrow="Property preferences"
          title="What James is looking for"
          hint="Shared with landlords so listings reach the right tenants."
        />
        <PreferenceTracker />
        <ShareBar />
      </main>
    </div>
  );
}

interface LivePassport {
  identity_verified: boolean;
  income_verified: boolean;
  reference_verified: boolean;
  right_to_rent_verified: boolean;
  monthly_income_net: number | null;
  id_document_type: string | null;
  employment_status: string | null;
  previous_landlord_name: string | null;
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-surface/85 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-foreground text-[var(--color-primary-foreground)]">
            <Home className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <span className="font-display text-base font-semibold tracking-tight">
            Roost<span className="text-verified">.</span>ni
          </span>
        </Link>
        <div className="flex items-center gap-1.5">
          <Link
            to="/auth"
            className="hidden rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary sm:inline"
          >
            Sign in
          </Link>
          <button
            type="button"
            aria-label="Notifications"
            className="relative grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-foreground/80 transition hover:bg-secondary"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-verified" />
          </button>
          <button
            type="button"
            className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-2.5 text-sm transition hover:bg-secondary"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-secondary font-display text-xs font-semibold text-foreground">
              JS
            </span>
            <span className="hidden text-sm font-medium sm:inline">James</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </header>
  );
}

function PageIntro() {
  return (
    <div className="mb-5">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Tenant Passport
      </p>
      <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        Good evening, James.
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your passport is up to date and ready to share with landlords across Northern Ireland.
      </p>
    </div>
  );
}

function PassportStatusCard() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-surface p-5 shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_48px_-32px_rgba(15,23,42,0.18)] sm:p-7">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-verified-soft blur-2xl"
      />
      <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-verified-soft px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-verified">
            <ShieldCheck className="h-3.5 w-3.5" />
            Ready-to-Rent · Verified
          </span>
          <h2 className="mt-3 font-display text-xl font-semibold tracking-tight sm:text-2xl">
            Passport #NI-2914-JS
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            All four checks complete. Refreshed 12 June 2026 · Valid for 90 days.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-3xl font-semibold tracking-tight text-verified sm:text-4xl">
            100<span className="text-base text-muted-foreground">/100</span>
          </div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Trust score</p>
        </div>
      </div>
      <div className="relative mt-5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full w-full rounded-full bg-verified" />
      </div>
      <div className="relative mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted-foreground sm:grid-cols-4">
        {[
          ["Identity", "Verified"],
          ["Income", "Verified"],
          ["Reference", "Verified"],
          ["Right to rent", "Verified"],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5">
            <BadgeCheck className="h-3.5 w-3.5 text-verified" />
            <span className="text-foreground">{k}</span>
            <span>· {v}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  hint,
}: {
  eyebrow: string;
  title: string;
  hint?: string;
}) {
  return (
    <div className="mt-10 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {eyebrow}
        </p>
        <h3 className="mt-1 font-display text-lg font-semibold tracking-tight sm:text-xl">
          {title}
        </h3>
      </div>
      {hint ? (
        <p className="hidden max-w-xs text-right text-xs text-muted-foreground sm:block">{hint}</p>
      ) : null}
    </div>
  );
}

function CredentialCard({
  icon: Icon,
  label,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="group flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_0_rgba(15,23,42,0.03),0_12px_28px_-24px_rgba(15,23,42,0.18)] transition hover:border-foreground/15 hover:shadow-[0_1px_0_rgba(15,23,42,0.04),0_20px_40px_-24px_rgba(15,23,42,0.22)]">
      <div className="flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-foreground">
          <Icon className="h-4 w-4" />
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-verified-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-verified">
          <BadgeCheck className="h-3 w-3" />
          Verified
        </span>
      </div>
      <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <h4 className="mt-1 font-display text-base font-semibold tracking-tight">{title}</h4>
      <div className="mt-3 text-sm text-muted-foreground">{children}</div>
    </article>
  );
}

function IdentityCard() {
  return (
    <CredentialCard icon={IdCard} label="Identity" title="Government Photo ID">
      <ul className="space-y-1.5">
        <Row k="Document" v="UK Passport" />
        <Row k="Issued" v="Mar 2022" />
        <Row k="Checked by" v="Yoti · Live selfie" />
      </ul>
    </CredentialCard>
  );
}

function IncomeCard() {
  return (
    <CredentialCard icon={Banknote} label="Income & employment" title="£2,840 net / month">
      <ul className="space-y-1.5">
        <Row k="Employer" v="Belfast City Council" />
        <Row k="Contract" v="Permanent · 3y 2m" />
        <Row k="Affordability" v="Up to £950 pcm" />
      </ul>
    </CredentialCard>
  );
}

function ReferenceCard() {
  return (
    <CredentialCard icon={UserRoundCheck} label="Character reference" title="Previous landlord">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary font-display text-xs font-semibold text-foreground">
          MD
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">Margaret Doherty</p>
          <p className="text-xs text-muted-foreground">Lisburn Road, BT9 · 2022–2025</p>
          <p className="mt-2 text-xs italic text-muted-foreground">
            “Quiet, tidy and always paid on time. Left the house spotless.”
          </p>
        </div>
      </div>
    </CredentialCard>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <li className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="truncate font-medium text-foreground">{v}</span>
    </li>
  );
}

function PreferenceTracker() {
  const chips = [
    { icon: MapPin, label: "South & East Belfast, Lisburn, Holywood" },
    { icon: PoundSterling, label: "£750 – £950 pcm" },
    { icon: BedDouble, label: "2 bed · unfurnished" },
    { icon: CalendarDays, label: "Move-in by 1 Sept 2026" },
  ];
  return (
    <section className="mt-5 rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_0_rgba(15,23,42,0.03),0_12px_28px_-24px_rgba(15,23,42,0.18)] sm:p-6">
      <div className="flex flex-wrap gap-2">
        {chips.map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-3 py-1.5 text-xs font-medium text-foreground/80"
          >
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            {label}
          </span>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4 rounded-2xl border border-verified/20 bg-verified-soft/50 p-4 sm:p-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface text-verified shadow-sm">
          <Flame className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-verified">
            Local NI preference
          </p>
          <p className="mt-1 font-display text-base font-semibold tracking-tight text-foreground">
            Bulk Oil / Gas heating — empty-in, full-out
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Happy to top up the tank on move-in and leave it full on move-out. Honest agreement,
            no end-of-tenancy surprises.
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" />
        Matched against 142 active listings this week in your areas.
      </div>
    </section>
  );
}

function ShareBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/90 px-4 py-3 backdrop-blur sm:static sm:mt-10 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-0">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
        <button
          type="button"
          onClick={() =>
            toast.success("Passport shared successfully", {
              description:
                "Landlord James Murphy has received your verified compliance data.",
            })
          }
          className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 py-4 font-display text-base font-semibold text-[var(--color-primary-foreground)] shadow-[0_12px_28px_-12px_rgba(15,23,42,0.45)] transition hover:translate-y-[-1px] hover:bg-foreground/92 active:translate-y-0"
        >
          <Share2 className="h-4 w-4" />
          Share Passport to Landlord
        </button>
      </div>
      <p className="mx-auto mt-2 flex max-w-3xl items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <Lock className="h-3 w-3" />
        Encrypted link · expires after 7 days · revoke any time
      </p>
    </div>
  );
}
