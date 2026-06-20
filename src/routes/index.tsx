import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ViewSwitcher } from "../components/view-switcher";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Profile } from "@/hooks/use-auth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  LogOut,
  LayoutDashboard,
  UserRound,
  Inbox,
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
  const [passportLoaded, setPassportLoaded] = useState(false);

  useEffect(() => {
    if (!user || (profile && profile.account_type !== "tenant")) {
      setLivePassport(null);
      setPassportLoaded(true);
      return;
    }
    supabase
      .from("tenant_passports")
      .select(
        "identity_verified, income_verified, reference_verified, right_to_rent_verified, monthly_income_net, id_document_type, employment_status, previous_landlord_name",
      )
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setLivePassport((data as LivePassport | null) ?? null);
        setPassportLoaded(true);
      });
  }, [user, profile]);

  const anyVerified = !!(
    livePassport &&
    (livePassport.identity_verified ||
      livePassport.income_verified ||
      livePassport.reference_verified ||
      livePassport.right_to_rent_verified)
  );
  const fullyVerified = !!(
    livePassport &&
    livePassport.identity_verified &&
    livePassport.income_verified &&
    livePassport.reference_verified &&
    livePassport.right_to_rent_verified
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header user={user} profile={profile} />
      <main className="mx-auto w-full max-w-3xl px-4 pb-32 pt-6 sm:px-6 sm:pt-10">
        <ViewSwitcher />
        <PageIntro
          name={profile?.full_name?.split(" ")[0] ?? "there"}
          signedIn={!!user}
          fullyVerified={fullyVerified}
        />
        <PassportStatusCard passport={livePassport} signedIn={!!user} />
        <SectionHeading
          eyebrow="Core credentials"
          title="Your verified record"
          hint={
            fullyVerified
              ? "All checks completed within the last 30 days."
              : "Complete each check to build your verified record."
          }
        />
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <IdentityCard passport={livePassport} />
          <IncomeCard passport={livePassport} />
          <ReferenceCard passport={livePassport} />
        </div>
        {anyVerified ? (
          <>
            <SectionHeading
              eyebrow="Property preferences"
              title="Your property preferences"
              hint="Shared with landlords so listings reach the right tenants."
            />
            <PreferenceTracker />
          </>
        ) : null}
        {fullyVerified ? <ShareBar /> : null}
        {passportLoaded && !fullyVerified && !!user ? <UnverifiedSharePrompt /> : null}
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

function Header({ user, profile }: { user: ReturnType<typeof useAuth>["user"]; profile: Profile | null }) {
  const signedIn = !!user;
  const fullName = profile?.full_name ?? user?.email ?? "Guest";
  const initials = (profile?.full_name ?? user?.email ?? "G")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const firstName = profile?.full_name?.split(" ")[0] ?? (user?.email?.split("@")[0] ?? "Guest");

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
          {!signedIn ? (
            <Link
              to="/auth"
              className="hidden rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary sm:inline"
            >
              Sign in
            </Link>
          ) : null}
          <NotificationsBell user={user} profile={profile} />
          <AccountMenu
            signedIn={signedIn}
            firstName={firstName}
            fullName={fullName}
            email={user?.email ?? null}
            initials={initials || "G"}
            accountType={profile?.account_type ?? null}
          />
        </div>
      </div>
    </header>
  );
}

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  created_at: string;
}

function NotificationsBell({
  user,
  profile,
}: {
  user: ReturnType<typeof useAuth>["user"];
  profile: Profile | null;
}) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoaded(true);
      return;
    }
    const isLandlord = profile?.account_type === "landlord";

    const load = async () => {
      let query = supabase
        .from("passport_shares")
        .select("id, status, shared_at, listing:property_listings(title, landlord_id)")
        .order("shared_at", { ascending: false })
        .limit(20);

      if (!isLandlord) {
        query = query.eq("tenant_id", user.id);
      }

      const { data } = await query;
      const rows = (data ?? []) as Array<{
        id: string;
        status: string | null;
        shared_at: string;
        listing: { title: string | null; landlord_id: string | null } | null;
      }>;

      const filtered = isLandlord
        ? rows.filter((r) => r.listing?.landlord_id === user.id)
        : rows;

      setItems(
        filtered.slice(0, 8).map((r) => {
          const listingTitle = r.listing?.title ?? "a property";
          return {
            id: r.id,
            title: isLandlord
              ? r.status === "accepted"
                ? "Application accepted"
                : "New tenant application"
              : r.status === "accepted"
                ? "Your application was accepted"
                : "Application submitted",
            description: listingTitle,
            created_at: r.shared_at,
          };
        }),
      );
      setLoaded(true);
    };

    load();
  }, [user, profile?.account_type]);

  const unread = items.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className="relative grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-foreground/80 transition hover:bg-secondary"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 ? (
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-verified" />
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 rounded-2xl border-border bg-surface p-0 shadow-[0_24px_48px_-24px_rgba(15,23,42,0.18)]"
      >
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <p className="font-display text-sm font-semibold tracking-tight">Notifications</p>
          {unread > 0 ? (
            <span className="rounded-full bg-verified-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-verified">
              {unread} new
            </span>
          ) : null}
        </div>
        {!user ? (
          <div className="p-5 text-sm text-muted-foreground">
            <p className="text-foreground font-medium">Sign in to see updates</p>
            <p className="mt-1 text-xs">
              Get notified when landlords review your passport or tenants apply to your listings.
            </p>
            <Link
              to="/auth"
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-[var(--color-primary-foreground)]"
            >
              Sign in
            </Link>
          </div>
        ) : !loaded ? (
          <div className="p-5 text-sm text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-5 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2 text-foreground">
              <Inbox className="h-4 w-4" />
              You're all caught up
            </span>
            <p className="mt-1 text-xs">New activity will appear here.</p>
          </div>
        ) : (
          <ul className="max-h-80 overflow-y-auto py-1">
            {items.map((n) => (
              <li key={n.id} className="px-2">
                <div className="rounded-xl px-3 py-2.5 hover:bg-secondary">
                  <p className="text-sm font-medium text-foreground">{n.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{n.description}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {new Date(n.created_at).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

function AccountMenu({
  signedIn,
  firstName,
  fullName,
  email,
  initials,
  accountType,
}: {
  signedIn: boolean;
  firstName: string;
  fullName: string;
  email: string | null;
  initials: string;
  accountType: "tenant" | "landlord" | "admin" | null;
}) {
  if (!signedIn) {
    return (
      <Link
        to="/auth"
        className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-2.5 text-sm transition hover:bg-secondary"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-secondary font-display text-xs font-semibold text-foreground">
          {initials}
        </span>
        <span className="hidden text-sm font-medium sm:inline">Sign in</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </Link>
    );
  }

  const dashboardLabel = accountType === "landlord" ? "Landlord dashboard" : "Tenant dashboard";

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Couldn't sign out", { description: error.message });
      return;
    }
    toast.success("Signed out");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-2.5 text-sm transition hover:bg-secondary"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-secondary font-display text-xs font-semibold text-foreground">
            {initials}
          </span>
          <span className="hidden text-sm font-medium sm:inline">{firstName}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-64 rounded-2xl border-border bg-surface p-1.5 shadow-[0_24px_48px_-24px_rgba(15,23,42,0.18)]"
      >
        <DropdownMenuLabel className="px-2.5 py-2">
          <p className="truncate font-display text-sm font-semibold tracking-tight">{fullName}</p>
          {email ? <p className="truncate text-xs font-normal text-muted-foreground">{email}</p> : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="rounded-xl px-2.5 py-2 text-sm">
          <Link to="/dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
            {dashboardLabel}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="rounded-xl px-2.5 py-2 text-sm">
          <Link to="/dashboard/passport/edit" className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-muted-foreground" />
            Edit passport
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            handleSignOut();
          }}
          className="rounded-xl px-2.5 py-2 text-sm text-foreground"
        >
          <LogOut className="mr-2 h-4 w-4 text-muted-foreground" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PageIntro({
  name,
  signedIn,
  fullyVerified,
}: {
  name: string;
  signedIn: boolean;
  fullyVerified: boolean;
}) {
  return (
    <div className="mb-5">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Tenant Passport
      </p>
      <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        {signedIn ? `Good evening, ${name}.` : "Good evening."}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {fullyVerified
          ? "Your passport is up to date and ready to share with landlords across Northern Ireland."
          : "Build your verified Tenant Passport to apply to NI landlords in one tap."}
      </p>
    </div>
  );
}

function PassportStatusCard({
  passport,
  signedIn,
}: {
  passport: LivePassport | null;
  signedIn: boolean;
}) {
  const flags: [string, boolean][] = [
    ["Identity", !!passport?.identity_verified],
    ["Income", !!passport?.income_verified],
    ["Reference", !!passport?.reference_verified],
    ["Right to rent", !!passport?.right_to_rent_verified],
  ];
  const verifiedCount = flags.filter(([, ok]) => ok).length;
  const score = Math.round((verifiedCount / 4) * 100);
  const ready = score === 100;
  const showBuildCta = signedIn && !ready;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-surface p-5 shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_48px_-32px_rgba(15,23,42,0.18)] sm:p-7">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-verified-soft blur-2xl"
      />
      <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${
              ready
                ? "bg-verified-soft text-verified"
                : "bg-surface-muted text-muted-foreground"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {ready ? "Ready-to-Rent · Verified" : `${verifiedCount}/4 checks complete`}
          </span>
          <h2 className="mt-3 font-display text-xl font-semibold tracking-tight sm:text-2xl">
            {ready ? "Verified Tenant Passport" : "Finish your passport"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {ready
              ? "All four checks complete. Ready to share with NI landlords."
              : "Complete the remaining steps to unlock the Verified badge."}
          </p>
          {signedIn && ready ? (
            <Link
              to="/dashboard/passport/edit"
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary"
            >
              <Pencil className="h-3 w-3" />
              Edit passport
            </Link>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <div
            className={`font-display text-3xl font-semibold tracking-tight sm:text-4xl ${
              ready ? "text-verified" : "text-foreground"
            }`}
          >
            {score}
            <span className="text-base text-muted-foreground">/100</span>
          </div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Trust score</p>
        </div>
      </div>
      <div className="relative mt-5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-verified transition-all"
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="relative mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted-foreground sm:grid-cols-4">
        {flags.map(([k, ok]) => (
          <div key={k} className="flex items-center gap-1.5">
            {ok ? (
              <BadgeCheck className="h-3.5 w-3.5 text-verified" />
            ) : (
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className="text-foreground">{k}</span>
            <span>· {ok ? "Verified" : "Pending"}</span>
          </div>
        ))}
      </div>
      {showBuildCta ? (
        <Link
          to="/dashboard/passport/edit"
          className="relative mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3.5 font-display text-sm font-semibold text-[var(--color-primary-foreground)] shadow-[0_12px_28px_-12px_rgba(15,23,42,0.45)] transition hover:translate-y-[-1px] hover:bg-foreground/92 active:translate-y-0 sm:text-base"
        >
          <Sparkles className="h-4 w-4" />
          Build Your Tenant Passport
        </Link>
      ) : null}
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
  verified = true,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  title: string;
  verified?: boolean;
  children: React.ReactNode;
}) {
  return (
    <article className="group flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_0_rgba(15,23,42,0.03),0_12px_28px_-24px_rgba(15,23,42,0.18)] transition hover:border-foreground/15 hover:shadow-[0_1px_0_rgba(15,23,42,0.04),0_20px_40px_-24px_rgba(15,23,42,0.22)]">
      <div className="flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-foreground">
          <Icon className="h-4 w-4" />
        </span>
        {verified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-verified-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-verified">
            <BadgeCheck className="h-3 w-3" />
            Verified
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        )}
      </div>
      <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <h4 className="mt-1 font-display text-base font-semibold tracking-tight">{title}</h4>
      <div className="mt-3 text-sm text-muted-foreground">{children}</div>
    </article>
  );
}

function IdentityCard({ passport }: { passport: LivePassport | null }) {
  const verified = passport ? passport.identity_verified : true;
  const docLabel =
    passport?.id_document_type === "driving_licence"
      ? "UK Driving Licence"
      : passport?.id_document_type === "passport"
        ? "UK / EU Passport"
        : "UK Passport";
  return (
    <CredentialCard icon={IdCard} label="Identity" title="Government Photo ID" verified={verified}>
      <ul className="space-y-1.5">
        <Row k="Document" v={verified ? docLabel : "Not yet uploaded"} />
        <Row k="Checked by" v={verified ? "Roost verification" : "Pending"} />
      </ul>
    </CredentialCard>
  );
}

function IncomeCard({ passport }: { passport: LivePassport | null }) {
  const verified = passport ? passport.income_verified : true;
  const monthly = passport?.monthly_income_net
    ? `£${Number(passport.monthly_income_net).toLocaleString()} / month`
    : "£2,840 net / month";
  const employmentLabel = passport?.employment_status
    ? passport.employment_status.replace(/_/g, " ")
    : "Permanent · Full-time";
  return (
    <CredentialCard
      icon={Banknote}
      label="Income & employment"
      title={verified ? monthly : "Income pending"}
      verified={verified}
    >
      <ul className="space-y-1.5">
        <Row k="Contract" v={verified ? employmentLabel : "Not yet provided"} />
        <Row
          k="Affordability"
          v={
            verified && passport?.monthly_income_net
              ? `Up to £${Math.round(Number(passport.monthly_income_net) * 0.35).toLocaleString()} pcm`
              : "—"
          }
        />
      </ul>
    </CredentialCard>
  );
}

function ReferenceCard({ passport }: { passport: LivePassport | null }) {
  const verified = passport ? passport.reference_verified : true;
  const name = passport?.previous_landlord_name ?? "Margaret Doherty";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <CredentialCard
      icon={UserRoundCheck}
      label="Character reference"
      title="Previous landlord"
      verified={verified}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary font-display text-xs font-semibold text-foreground">
          {initials || "—"}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {verified ? name : "Reference pending"}
          </p>
          <p className="text-xs text-muted-foreground">
            {verified ? "Contactable on file" : "Add a previous landlord to verify"}
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
