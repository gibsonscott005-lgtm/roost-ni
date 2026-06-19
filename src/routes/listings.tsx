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
} from "lucide-react";
import { ViewSwitcher } from "../components/view-switcher";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/listings")({
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
  component: ListingsPage,
});

interface Listing {
  id: string;
  title: string;
  monthly_rent: number;
  address: string;
  location: string | null;
  heating_type: string;
  enforce_empty_in_full_out: boolean;
}

function ListingsPage() {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("property_listings")
      .select(
        "id, title, monthly_rent, address, location, heating_type, enforce_empty_in_full_out",
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
    if (!q) return rows;
    return rows.filter((l) =>
      [l.title, l.address, l.location ?? "", l.heating_type].some((v) =>
        v.toLowerCase().includes(q),
      ),
    );
  }, [rows, query]);

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
            Every listing comes from a registered NI landlord. {loading ? "Loading…" : `${filtered.length} listings live.`}
          </p>
        </div>

        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-border bg-surface p-2 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_28px_-24px_rgba(15,23,42,0.18)]">
          <Search className="ml-2 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by location, postcode or heating type…"
            className="h-10 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/80 focus:outline-none"
          />
          <button
            type="button"
            className="hidden items-center gap-1.5 rounded-xl border border-border bg-surface-muted px-3 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground sm:inline-flex"
          >
            Filters
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
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
            No listings match your search yet.
          </p>
        ) : null}
      </main>
    </div>
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
  return (
    <article className="flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_0_rgba(15,23,42,0.03),0_12px_28px_-24px_rgba(15,23,42,0.18)] transition hover:border-foreground/15">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
          {listing.title}
        </h3>
        {listing.enforce_empty_in_full_out ? (
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
        <Link
          to="/listings/$id"
          params={{ id: listing.id }}
          className="rounded-full border border-border bg-surface-muted px-3.5 py-2 text-xs font-medium text-foreground transition hover:bg-secondary"
        >
          View details
        </Link>
      </div>
    </article>
  );
}