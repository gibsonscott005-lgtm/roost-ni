import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bell,
  Building2,
  Check,
  Flame,
  Home,
  ImageIcon,
  MapPin,
  PoundSterling,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

interface ListingDetail {
  id: string;
  title: string;
  address: string;
  location: string | null;
  monthly_rent: number;
  deposit: number;
  ni_landlord_reg_number: string;
  heating_type: string;
  enforce_empty_in_full_out: boolean;
  tenant_preferences: string[];
}

export const Route = createFileRoute("/listings/$id")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("property_listings")
      .select(
        "id, title, address, location, monthly_rent, deposit, ni_landlord_reg_number, heating_type, enforce_empty_in_full_out, tenant_preferences",
      )
      .eq("id", params.id)
      .eq("is_published", true)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound();
    return data as ListingDetail;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Listing — Roost NI" }] };
    const t = `${loaderData.title} — Roost NI`;
    const d = `${loaderData.address}${loaderData.location ? ` · ${loaderData.location}` : ""} · £${Number(loaderData.monthly_rent).toLocaleString()} pcm · Heating: ${loaderData.heating_type}.`;
    return {
      meta: [
        { title: t },
        { name: "description", content: d },
        { property: "og:title", content: t },
        { property: "og:description", content: d },
      ],
    };
  },
  errorComponent: ({ error }) => {
    const router = useRouter();
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <p className="font-display text-lg font-semibold tracking-tight">Couldn't load this listing</p>
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
  notFoundComponent: () => (
    <div className="mx-auto max-w-md p-10 text-center">
      <p className="font-display text-lg font-semibold tracking-tight">Listing not found</p>
      <p className="mt-1 text-sm text-muted-foreground">It may have been unpublished or removed.</p>
      <Link
        to="/listings"
        className="mt-5 inline-flex rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
      >
        Back to browse
      </Link>
    </div>
  ),
  component: ListingDetailPage,
});

function ListingDetailPage() {
  const listing = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 sm:px-6 sm:pt-10">
        <Link
          to="/listings"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All properties
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Verified NI listing
            </p>
            <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              {listing.title}
            </h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {listing.address}
              {listing.location ? ` · ${listing.location}` : null}
            </p>
          </div>
          {listing.enforce_empty_in_full_out ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-verified-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-verified">
              <ShieldCheck className="h-3 w-3" />
              Fair fuel
            </span>
          ) : null}
        </div>

        <PhotoGalleryPlaceholder />

        <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat
            label="Monthly rent"
            value={
              <>
                <PoundSterling className="-mt-1 mr-0.5 inline h-4 w-4 text-muted-foreground" />
                {Number(listing.monthly_rent).toLocaleString()}
                <span className="ml-1 text-xs font-medium text-muted-foreground">pcm</span>
              </>
            }
          />
          <Stat
            label="Deposit"
            value={
              <>
                <PoundSterling className="-mt-1 mr-0.5 inline h-4 w-4 text-muted-foreground" />
                {Number(listing.deposit).toLocaleString()}
              </>
            }
          />
          <Stat
            label="Heating"
            value={
              <span className="inline-flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-muted-foreground" />
                {listing.heating_type}
              </span>
            }
          />
        </section>

        <section className="mt-5 rounded-3xl border border-border bg-surface p-5 shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_48px_-32px_rgba(15,23,42,0.18)] sm:p-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            NI compliance
          </p>
          <h2 className="mt-1 font-display text-lg font-semibold tracking-tight sm:text-xl">
            Verified utility & registration details
          </h2>

          <dl className="mt-5 divide-y divide-border rounded-2xl border border-border bg-surface-muted/50 text-sm">
            <DetailRow k="Landlord registration" v={listing.ni_landlord_reg_number} icon={Building2} />
            <DetailRow k="Heating & utility" v={listing.heating_type} icon={Flame} />
            <DetailRow
              k="Empty-in / Full-out fuel agreement"
              v={listing.enforce_empty_in_full_out ? "Enforced" : "Not enforced"}
              icon={ShieldCheck}
              tone={listing.enforce_empty_in_full_out ? "good" : "neutral"}
            />
          </dl>

          {listing.tenant_preferences?.length ? (
            <>
              <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Tenant preferences
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {listing.tenant_preferences.map((p: string) => (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-medium text-foreground"
                  >
                    <Check className="h-3 w-3 text-verified" strokeWidth={3} />
                    {p}
                  </span>
                ))}
              </div>
            </>
          ) : null}
        </section>

        <ApplyCard listingId={listing.id} />
      </main>
    </div>
  );
}

function ApplyCard({ listingId }: { listingId: string }) {
  const { user, profile, loading } = useAuth();
  const queryClient = useQueryClient();
  const isTenant = !!user && profile?.account_type === "tenant";

  const shareQuery = useQuery({
    enabled: isTenant,
    queryKey: ["passport-share", listingId, user?.id ?? null],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("passport_shares")
        .select("id, status")
        .eq("listing_id", listingId)
        .eq("tenant_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const sent = !!shareQuery.data;

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("passport_shares")
        .insert({ tenant_id: user.id, listing_id: listingId, status: "pending" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Passport shared successfully", {
        description: "The landlord has received your verified compliance data.",
        className:
          "border border-verified/30 bg-verified-soft text-verified-foreground",
      });
      queryClient.invalidateQueries({
        queryKey: ["passport-share", listingId, user?.id ?? null],
      });
      queryClient.invalidateQueries({ queryKey: ["landlord-applications"] });
    },
    onError: (err: unknown) => {
      const e = err as { code?: string; message?: string };
      if (e?.code === "23505") {
        queryClient.invalidateQueries({
          queryKey: ["passport-share", listingId, user?.id ?? null],
        });
        toast("Already applied", {
          description: "You've already shared your passport with this property.",
        });
        return;
      }
      toast.error("Couldn't share passport", {
        description: e?.message ?? "Please try again.",
      });
    },
  });

  const submitting = applyMutation.isPending;

  if (loading) return null;

  if (!user) {
    return (
      <div className="mt-6 flex flex-col items-start gap-3 rounded-3xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="font-display text-base font-semibold tracking-tight">
            Apply with your verified Tenant Passport
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Sign in to share your verified ID, income and references in one tap.
          </p>
        </div>
        <Link
          to="/auth"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-verified px-5 py-3 font-display text-sm font-semibold text-[var(--color-verified-foreground)] shadow-[0_12px_28px_-12px_rgba(16,121,75,0.45)] transition hover:brightness-95 sm:w-auto"
        >
          <Sparkles className="h-4 w-4" />
          Sign in to apply
        </Link>
      </div>
    );
  }

  if (profile?.account_type === "landlord") {
    return (
      <div className="mt-6 rounded-3xl border border-dashed border-border bg-surface-muted/40 p-5 text-sm text-muted-foreground sm:p-6">
        You're viewing as a landlord. Tenants will see an "Apply with Tenant Passport" button here.
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col items-start gap-3 rounded-3xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div>
        <p className="font-display text-base font-semibold tracking-tight">
          {sent ? "Passport shared" : "Apply with your Tenant Passport"}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {sent
            ? "The landlord has your verified compliance data. You'll be notified when they respond."
            : "Share your verified ID, income, references and right-to-rent in one tap."}
        </p>
      </div>
      <button
        type="button"
        onClick={() => applyMutation.mutate()}
        disabled={sent || submitting}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 font-display text-sm font-semibold shadow-[0_12px_28px_-12px_rgba(16,121,75,0.45)] transition sm:w-auto ${
          sent
            ? "cursor-not-allowed bg-verified-soft text-verified"
            : "bg-verified text-[var(--color-verified-foreground)] hover:brightness-95 disabled:opacity-60"
        }`}
      >
        {sent ? (
          <>
            <Check className="h-4 w-4" strokeWidth={3} />
            Application submitted
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            {submitting ? "Sharing…" : "Apply with Tenant Passport"}
          </>
        )}
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function DetailRow({
  k,
  v,
  icon: Icon,
  tone,
}: {
  k: string;
  v: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "good" | "neutral";
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <dt className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {k}
      </dt>
      <dd
        className={`text-sm font-medium ${
          tone === "good" ? "text-verified" : "text-foreground"
        }`}
      >
        {v}
      </dd>
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
            to="/listings"
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary sm:text-sm"
          >
            All properties
          </Link>
        </div>
      </div>
    </header>
  );
}