import { getEventContext } from "@/lib/utm-session";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { LogoMark } from "@/components/logo";
import { useMemo, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Bell,
  BellRing,
  CheckCircle2,
  ChevronDown,
  Flame,
  Loader2,
  Mail,
  MapPin,
  PoundSterling,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { ViewSwitcher } from "../components/view-switcher";
import { ListingCover } from "@/components/listing-photos";
import { getListingCoverUrls } from "@/lib/listing-photos.functions";
import { supabase } from "@/integrations/supabase/client";
import { subscribeToListingAlerts } from "@/lib/listing-alerts.functions";
import { posthog } from "@/integrations/posthog/client";
import {
  FURNISHED_OPTIONS,
  PROPERTY_TYPES,
  bedroomLabel,
} from "@/lib/listing-details";

export const Route = createFileRoute("/listings/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Houses to Rent in Belfast & Northern Ireland — RoostNI" },
      {
        name: "description",
        content:
          "Browse houses and flats to rent in Belfast and across Northern Ireland. Registered landlords, honest rent and transparent fuel policies — set a free listing alert.",
      },
      { property: "og:title", content: "Houses to Rent in Belfast & Northern Ireland — RoostNI" },
      {
        property: "og:description",
        content:
          "Houses and flats to rent from registered NI landlords. Every property compliant, every fuel policy honest.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://roostni.co.uk/listings" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://roostni.co.uk/listings" }],
  }),
  loader: async () => {
    const { data } = await supabase
      .from("property_listings")
      .select(
        "id, title, monthly_rent, address, location, heating_type, enforce_empty_in_full_out, status, photo_urls, property_type, bedrooms, bathrooms, furnished, available_from, bills_included, parking",
      )
      .eq("is_published", true)
      .order("created_at", { ascending: false });
    const rows = (data as Listing[] | null) ?? [];
    // Sign cover photos on the server so the first paint already contains real
    // images — strict in-app browsers can drop direct storage requests.
    const covers = await getListingCoverUrls({
      data: { listingIds: rows.map((r) => r.id) },
    }).catch(() => ({}) as Record<string, string>);
    return { rows, covers };
  },
  errorComponent: ({ error }) => {
    const router = useRouter();
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <p className="font-display text-lg font-semibold tracking-tight">
          Couldn't load listings
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{(error as Error).message}</p>
        <button
          type="button"
          onClick={() => router.invalidate()}
          className="mt-5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
        >
          Try again
        </button>
      </div>
    );
  },
  component: ListingsIndexPage,
});

interface Listing {
  id: string;
  title: string;
  monthly_rent: number;
  address: string;
  location: string | null;
  heating_type: string;
  enforce_empty_in_full_out: boolean;
  status: string;
  photo_urls: string[] | null;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  furnished: string | null;
  available_from: string | null;
  bills_included: string[] | null;
  parking: string | null;
}

const HEATING_FILTERS = ["Any", "Oil", "LPG", "Gas", "Electric"] as const;
const BEDROOM_FILTERS = ["Any", "Studio", "1+", "2+", "3+", "4+"] as const;
type SortKey = "newest" | "rent_asc" | "rent_desc" | "beds_desc" | "available";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest first" },
  { key: "rent_asc", label: "Rent: low to high" },
  { key: "rent_desc", label: "Rent: high to low" },
  { key: "beds_desc", label: "Most bedrooms" },
  { key: "available", label: "Available soonest" },
];

function ListingsIndexPage() {
  const { rows, covers } = Route.useLoaderData();
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [maxRent, setMaxRent] = useState("");
  const [minRent, setMinRent] = useState("");
  const [heating, setHeating] = useState<(typeof HEATING_FILTERS)[number]>("Any");
  const [fairFuelOnly, setFairFuelOnly] = useState(false);
  const [hideLetAgreed, setHideLetAgreed] = useState(false);
  const [beds, setBeds] = useState<(typeof BEDROOM_FILTERS)[number]>("Any");
  const [propertyType, setPropertyType] = useState("Any");
  const [furnished, setFurnished] = useState("Any");
  const [availableNow, setAvailableNow] = useState(false);
  const [billsOnly, setBillsOnly] = useState(false);
  const [parkingOnly, setParkingOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("newest");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = minRent ? Number(minRent) : null;
    const max = maxRent ? Number(maxRent) : null;

    const list = rows.filter((l) => {
      if (
        q &&
        ![l.title, l.address, l.location ?? "", l.heating_type].some((v) =>
          v.toLowerCase().includes(q),
        )
      )
        return false;
      const rent = Number(l.monthly_rent);
      if (min !== null && rent < min) return false;
      if (max !== null && rent > max) return false;
      if (heating !== "Any" && l.heating_type !== heating) return false;
      if (fairFuelOnly && !l.enforce_empty_in_full_out) return false;
      if (hideLetAgreed && l.status !== "available") return false;
      if (beds !== "Any") {
        if (l.bedrooms === null) return false;
        if (beds === "Studio") {
          if (l.bedrooms !== 0) return false;
        } else if (l.bedrooms < Number(beds.replace("+", ""))) return false;
      }
      if (propertyType !== "Any" && l.property_type !== propertyType) return false;
      if (furnished !== "Any" && l.furnished !== furnished) return false;
      if (availableNow) {
        if (!l.available_from) return false;
        const d = new Date(`${l.available_from}T00:00:00`).getTime();
        if (Number.isNaN(d) || d > new Date().setHours(0, 0, 0, 0)) return false;
      }
      if (billsOnly && !(l.bills_included?.length ?? 0)) return false;
      if (parkingOnly && (!l.parking || l.parking === "None")) return false;
      return true;
    });

    if (sort === "rent_asc")
      return [...list].sort((a, b) => Number(a.monthly_rent) - Number(b.monthly_rent));
    if (sort === "rent_desc")
      return [...list].sort((a, b) => Number(b.monthly_rent) - Number(a.monthly_rent));
    if (sort === "beds_desc")
      return [...list].sort((a, b) => (b.bedrooms ?? -1) - (a.bedrooms ?? -1));
    if (sort === "available")
      return [...list].sort(
        (a, b) =>
          new Date(a.available_from ?? "2999-12-31").getTime() -
          new Date(b.available_from ?? "2999-12-31").getTime(),
      );
    return list;
  }, [
    rows,
    query,
    minRent,
    maxRent,
    heating,
    fairFuelOnly,
    hideLetAgreed,
    beds,
    propertyType,
    furnished,
    availableNow,
    billsOnly,
    parkingOnly,
    sort,
  ]);

  const activeFilters =
    (minRent ? 1 : 0) +
    (maxRent ? 1 : 0) +
    (heating !== "Any" ? 1 : 0) +
    (fairFuelOnly ? 1 : 0) +
    (hideLetAgreed ? 1 : 0) +
    (beds !== "Any" ? 1 : 0) +
    (propertyType !== "Any" ? 1 : 0) +
    (furnished !== "Any" ? 1 : 0) +
    (availableNow ? 1 : 0) +
    (billsOnly ? 1 : 0) +
    (parkingOnly ? 1 : 0);

  const clearFilters = () => {
    setMinRent("");
    setMaxRent("");
    setHeating("Any");
    setFairFuelOnly(false);
    setHideLetAgreed(false);
    setBeds("Any");
    setPropertyType("Any");
    setFurnished("Any");
    setAvailableNow(false);
    setBillsOnly(false);
    setParkingOnly(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:px-6 sm:pt-10">
        <ViewSwitcher />

        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Browse properties
          </p>
          <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Verified rentals across Northern Ireland
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every listing comes from a registered NI landlord. {filtered.length} listings
            live.
          </p>
        </div>

        <ListingAlertSignup />

        <div className="mb-6 rounded-2xl border border-border bg-surface p-2 shadow-raised">
          <div className="flex items-center gap-2">
            <Search className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by location, postcode or heating type…"
              className="h-10 w-full min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/80 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              aria-expanded={filtersOpen}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-surface-muted px-3 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilters > 0 ? (
                <span className="grid h-4 min-w-4 place-items-center rounded-full bg-verified px-1 text-[10px] font-semibold text-[var(--color-verified-foreground)]">
                  {activeFilters}
                </span>
              ) : null}
              <ChevronDown
                className={`h-3.5 w-3.5 transition ${filtersOpen ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          {filtersOpen ? (
            <div className="mt-2 space-y-4 border-t border-border px-2 pb-3 pt-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Min rent (£)</span>
                  <input
                    inputMode="numeric"
                    value={minRent}
                    onChange={(e) => setMinRent(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="400"
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-surface shadow-resting px-3 text-sm focus:outline-none focus:ring-2 focus:ring-verified/20"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Max rent (£)</span>
                  <input
                    inputMode="numeric"
                    value={maxRent}
                    onChange={(e) => setMaxRent(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="1200"
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-surface shadow-resting px-3 text-sm focus:outline-none focus:ring-2 focus:ring-verified/20"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Heating</span>
                  <select
                    value={heating}
                    onChange={(e) =>
                      setHeating(e.target.value as (typeof HEATING_FILTERS)[number])
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-surface shadow-resting px-3 text-sm focus:outline-none focus:ring-2 focus:ring-verified/20"
                  >
                    {HEATING_FILTERS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Sort by</span>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortKey)}
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-surface shadow-resting px-3 text-sm focus:outline-none focus:ring-2 focus:ring-verified/20"
                  >
                    {SORTS.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Bedrooms</span>
                  <select
                    value={beds}
                    onChange={(e) => setBeds(e.target.value as (typeof BEDROOM_FILTERS)[number])}
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-surface shadow-resting px-3 text-sm focus:outline-none focus:ring-2 focus:ring-verified/20"
                  >
                    {BEDROOM_FILTERS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Property type</span>
                  <select
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-surface shadow-resting px-3 text-sm focus:outline-none focus:ring-2 focus:ring-verified/20"
                  >
                    <option value="Any">Any</option>
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Furnishing</span>
                  <select
                    value={furnished}
                    onChange={(e) => setFurnished(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-surface shadow-resting px-3 text-sm focus:outline-none focus:ring-2 focus:ring-verified/20"
                  >
                    <option value="Any">Any</option>
                    {FURNISHED_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <FilterChip
                  active={fairFuelOnly}
                  onClick={() => setFairFuelOnly((v) => !v)}
                  label="Fair Fuel only"
                />
                <FilterChip
                  active={hideLetAgreed}
                  onClick={() => setHideLetAgreed((v) => !v)}
                  label="Hide Let Agreed"
                />
                <FilterChip
                  active={availableNow}
                  onClick={() => setAvailableNow((v) => !v)}
                  label="Available now"
                />
                <FilterChip
                  active={billsOnly}
                  onClick={() => setBillsOnly((v) => !v)}
                  label="Bills included"
                />
                <FilterChip
                  active={parkingOnly}
                  onClick={() => setParkingOnly((v) => !v)}
                  label="Parking"
                />
                {activeFilters > 0 ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="ml-auto text-xs font-medium text-muted-foreground underline underline-offset-4 transition hover:text-foreground"
                  >
                    Clear all
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {rows.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-surface p-10 text-center">
            <p className="font-display text-base font-semibold tracking-tight">
              No listings yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              When NI landlords publish compliant listings, they'll appear here.
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((l) => (
            <ListingCard key={l.id} listing={l} coverUrl={covers[l.id]} />
          ))}
        </div>

        {rows.length > 0 && filtered.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            No listings match your search or filters yet.
          </p>
        ) : null}
      </main>
    </div>
  );
}

function ListingAlertSignup() {
  const subscribe = useServerFn(subscribeToListingAlerts);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      toast.error("Enter a valid email address");
      return;
    }
    setState("saving");
    try {
      const utm = getEventContext() as Record<string, string>;
      await subscribe({ data: { email: trimmed, utm } });
      posthog.capture("listing_alert_signup", { page: "/listings", ...utm });
      setState("done");
    } catch {
      setState("idle");
      toast.error("Couldn't save that just now", {
        description: "Please try again in a moment.",
      });
    }
  };

  if (state === "done") {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-verified/30 bg-verified-soft/50 p-4 shadow-resting sm:items-center">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-verified sm:mt-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">You're on the list.</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            We'll email {email.trim()} the moment a new NI home is published on RoostNI.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-2xl border border-border bg-surface p-4 shadow-resting sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-verified-soft/70 text-verified">
          <BellRing className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Be first to hear about new homes
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            New NI listings appear as landlords publish them. Leave your email and we'll
            let you know the moment one goes live — no account needed, nothing else sent.
          </p>
        </div>
      </div>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/80 focus:outline-none focus:ring-2 focus:ring-verified/20"
          />
        </div>
        <button
          type="submit"
          disabled={state === "saving"}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 text-sm font-semibold text-[var(--color-primary-foreground)] shadow-raised transition hover:bg-foreground/92 disabled:opacity-60"
        >
          {state === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Alert me
        </button>
      </form>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
        active
          ? "border-verified bg-verified-soft text-verified"
          : "border-border bg-surface-muted text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-surface/85 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <LogoMark />
          <span className="font-display text-base font-semibold tracking-tight">
            Roost<span className="text-verified">NI</span>
          </span>
        </Link>
        <div className="flex items-center gap-1.5">
          <Link
            to="/audit"
            className="hidden items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-xs font-semibold text-[var(--color-primary-foreground)] shadow-raised transition hover:bg-foreground/92 sm:inline-flex"
          >
            Run Free Landlord Audit
          </Link>
          <Link
            to="/beta"
            className="hidden rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground sm:inline-block"
          >
            About the beta
          </Link>

          <Link
            to="/help"
            className="hidden rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground sm:inline-block"
          >
            Help
          </Link>
          <button
            type="button"
            aria-label="Notifications"
            className="relative grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-foreground/80 transition hover:bg-secondary"
          >
            <Bell className="h-4 w-4" />
          </button>
          <Link
            to="/auth"
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary sm:text-sm"
          >
            Sign in
          </Link>
        </div>
      </div>
    </header>
  );
}

function ListingSpecStats({ listing }: { listing: Listing }) {
  const beds = bedroomLabel(listing.bedrooms);
  const bits = [
    listing.property_type,
    beds,
    listing.bathrooms ? `${listing.bathrooms} bath` : null,
    listing.furnished,
  ].filter(Boolean) as string[];
  if (bits.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {bits.map((b) => (
        <span
          key={b}
          className="inline-flex items-center rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-medium text-foreground"
        >
          {b}
        </span>
      ))}
    </div>
  );
}

function ListingCard({ listing, coverUrl }: { listing: Listing; coverUrl?: string }) {
  return (
    <Link
      to="/listings/$id"
      params={{ id: listing.id }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-raised transition hover:border-foreground/15 hover:shadow-floating"
    >
      <div className="border-b border-border">
        <ListingCover paths={listing.photo_urls} alt={listing.title} coverUrl={coverUrl} />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
            {listing.title}
          </h3>
          {listing.status === "under_offer" ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
              Under Offer
            </span>
          ) : listing.enforce_empty_in_full_out ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-verified-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-verified">
              <ShieldCheck className="h-3 w-3" />
              Fair fuel
            </span>
          ) : null}
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          {listing.address}
          {listing.location ? ` · ${listing.location}` : null}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Flame className="h-3.5 w-3.5" />
          {listing.heating_type}
        </p>
        <ListingSpecStats listing={listing} />
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Monthly rent
            </p>
            <p className="mt-0.5 font-display text-xl font-semibold tracking-tight text-foreground">
              <PoundSterling className="-mt-1 mr-0.5 inline h-4 w-4 text-muted-foreground" />
              {Number(listing.monthly_rent).toLocaleString()}
              <span className="ml-1 text-xs font-medium text-muted-foreground">pcm</span>
            </p>
          </div>
          <span className="rounded-full border border-border bg-surface-muted px-3.5 py-2 text-xs font-medium text-foreground transition group-hover:bg-secondary">
            View details
          </span>
        </div>
      </div>
    </Link>
  );
}
