import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChevronDown,
  Flame,
  Home,
  MapPin,
  PoundSterling,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { ViewSwitcher } from "../components/view-switcher";
import { ListingCover } from "@/components/listing-photos";
import { supabase } from "@/integrations/supabase/client";
import { bedroomLabel } from "@/lib/listing-details";

export const Route = createFileRoute("/listings/")({
  head: () => ({
    meta: [
      { title: "Browse Properties — Roost NI" },
      {
        name: "description",
        content:
          "Browse verified rental listings across Northern Ireland. Honest rent, transparent fuel policies and compliant landlords only.",
      },
      { property: "og:title", content: "Browse NI rentals — Roost" },
      {
        property: "og:description",
        content:
          "Verified listings from registered NI landlords. Every property compliant, every fuel policy honest.",
      },
    ],
  }),
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
}

const HEATING_FILTERS = ["Any", "Oil", "Gas", "Electric"] as const;
type SortKey = "newest" | "rent_asc" | "rent_desc";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest first" },
  { key: "rent_asc", label: "Rent: low to high" },
  { key: "rent_desc", label: "Rent: high to low" },
];

function ListingsIndexPage() {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [maxRent, setMaxRent] = useState("");
  const [minRent, setMinRent] = useState("");
  const [heating, setHeating] = useState<(typeof HEATING_FILTERS)[number]>("Any");
  const [fairFuelOnly, setFairFuelOnly] = useState(false);
  const [hideLetAgreed, setHideLetAgreed] = useState(false);
  const [sort, setSort] = useState<SortKey>("newest");

  useEffect(() => {
    supabase
      .from("property_listings")
      .select(
        "id, title, monthly_rent, address, location, heating_type, enforce_empty_in_full_out, status, photo_urls, property_type, bedrooms, bathrooms, furnished",
      )
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRows((data as Listing[] | null) ?? []);
        setLoading(false);
      });
  }, []);

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
      return true;
    });

    if (sort === "rent_asc")
      return [...list].sort((a, b) => Number(a.monthly_rent) - Number(b.monthly_rent));
    if (sort === "rent_desc")
      return [...list].sort((a, b) => Number(b.monthly_rent) - Number(a.monthly_rent));
    return list;
  }, [rows, query, minRent, maxRent, heating, fairFuelOnly, hideLetAgreed, sort]);

  const activeFilters =
    (minRent ? 1 : 0) +
    (maxRent ? 1 : 0) +
    (heating !== "Any" ? 1 : 0) +
    (fairFuelOnly ? 1 : 0) +
    (hideLetAgreed ? 1 : 0);

  const clearFilters = () => {
    setMinRent("");
    setMaxRent("");
    setHeating("Any");
    setFairFuelOnly(false);
    setHideLetAgreed(false);
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
            Every listing comes from a registered NI landlord.{" "}
            {loading ? "Loading…" : `${filtered.length} listings live.`}
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-border bg-surface p-2 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_28px_-24px_rgba(15,23,42,0.18)]">
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
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm focus:outline-none focus:ring-2 focus:ring-verified/20"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Max rent (£)</span>
                  <input
                    inputMode="numeric"
                    value={maxRent}
                    onChange={(e) => setMaxRent(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="1200"
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm focus:outline-none focus:ring-2 focus:ring-verified/20"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Heating</span>
                  <select
                    value={heating}
                    onChange={(e) =>
                      setHeating(e.target.value as (typeof HEATING_FILTERS)[number])
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm focus:outline-none focus:ring-2 focus:ring-verified/20"
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
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm focus:outline-none focus:ring-2 focus:ring-verified/20"
                  >
                    {SORTS.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
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

        {!loading && rows.length === 0 ? (
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
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>

        {!loading && rows.length > 0 && filtered.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            No listings match your search or filters yet.
          </p>
        ) : null}
      </main>
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
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-foreground text-[var(--color-primary-foreground)]">
            <Home className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <span className="font-display text-base font-semibold tracking-tight">
            Roost<span className="text-verified">.</span>ni
          </span>
        </Link>
        <div className="flex items-center gap-1.5">
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

function ListingCard({ listing }: { listing: Listing }) {
  return <ListingCardInner listing={listing} />;
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

function ListingCardInner({ listing }: { listing: Listing }) {
  return (
    <Link
      to="/listings/$id"
      params={{ id: listing.id }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_0_rgba(15,23,42,0.03),0_12px_28px_-24px_rgba(15,23,42,0.18)] transition hover:border-foreground/15 hover:shadow-[0_1px_0_rgba(15,23,42,0.04),0_20px_36px_-24px_rgba(15,23,42,0.25)]"
    >
      <div className="border-b border-border">
        <ListingCover paths={listing.photo_urls} alt={listing.title} />
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
