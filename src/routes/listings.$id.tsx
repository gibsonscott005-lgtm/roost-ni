import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { LogoMark } from "@/components/logo";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { emitNotification, type EmitNotificationInput } from "@/lib/notifications.functions";
import {
  reapplyApplication,
  withdrawApplication,
} from "@/lib/application-withdraw.functions";

function notify(payload: EmitNotificationInput) {
  emitNotification({ data: payload }).catch((err) =>
    console.error("[notify]", err),
  );
}
import { toast } from "sonner";
import {
  ArrowLeft,
  Bell,
  Building2,
  Check,
  Flame,
  MapPin,
  PoundSterling,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ListingGallery } from "@/components/listing-photos";
import {
  LISTING_DETAIL_COLUMNS,
  bedroomLabel,
  fairFuelSentence,
  formatAvailableFrom,
  minTenancyLabel,
  type ListingDetailFields,
} from "@/lib/listing-details";

interface ListingDetail extends ListingDetailFields {
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
  status: string;
  photo_urls: string[] | null;
}

export const Route = createFileRoute("/listings/$id")({
  staticData: { sitemap: false },
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("property_listings")
      .select(
        `id, title, address, location, monthly_rent, deposit, ni_landlord_reg_number, heating_type, enforce_empty_in_full_out, tenant_preferences, status, photo_urls, ${LISTING_DETAIL_COLUMNS}`,
      )
      .eq("id", params.id)
      .eq("is_published", true)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound();
      return data as unknown as ListingDetail;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Listing — RoostNI" }] };
    const t = `${loaderData.title} — RoostNI`;
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
              NI listing
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
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {listing.status === "under_offer" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                Under Offer
              </span>
            ) : null}
            {listing.enforce_empty_in_full_out ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-verified-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-verified">
                <ShieldCheck className="h-3 w-3" />
                Fair fuel
              </span>
            ) : null}
          </div>
        </div>

        <section className="mt-6 overflow-hidden rounded-3xl border border-border bg-surface shadow-resting">
          <ListingGallery paths={listing.photo_urls} alt={listing.title} />
        </section>

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

        <PropertyDetailsSection listing={listing} />

        <section className="mt-5 rounded-3xl border border-border bg-surface p-5 shadow-floating sm:p-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            NI compliance
          </p>
          <h2 className="mt-1 font-display text-lg font-semibold tracking-tight sm:text-xl">
            Utility & registration details
          </h2>

          <dl className="mt-5 divide-y divide-border rounded-2xl border border-border bg-surface-muted/50 text-sm">
            <DetailRow k="Landlord registration" v={listing.ni_landlord_reg_number} icon={Building2} />
            <DetailRow k="Heating & utility" v={listing.heating_type} icon={Flame} />
            <DetailRow
              k="Fair Fuel — same level out"
              v={
                listing.enforce_empty_in_full_out
                  ? `Enforced — ${fairFuelSentence(listing.heating_type)}`
                  : "Not enforced"
              }
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

        <ApplyCard listingId={listing.id} listingStatus={listing.status} />
      </main>
    </div>
  );
}

function ApplyCard({ listingId, listingStatus }: { listingId: string; listingStatus: string }) {
  const { user, profile, loading } = useAuth();
  const queryClient = useQueryClient();
  const isTenant = !!user && profile?.account_type === "tenant";
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState("");

  const shareQuery = useQuery({
    enabled: isTenant,
    queryKey: ["passport-share", listingId, user?.id ?? null],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("passport_shares")
        .select("id, status, lease_status, withdrawn_at")
        .eq("listing_id", listingId)
        .eq("tenant_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const share = shareQuery.data as
    | { id: string; status: string; lease_status: string | null; withdrawn_at: string | null }
    | null
    | undefined;
  const isWithdrawn = share?.status === "withdrawn";
  const sent = !!share && !isWithdrawn;
  const leaseIssued = !!share?.lease_status;
  const underOffer = listingStatus === "under_offer";

  const invalidateShare = () => {
    queryClient.invalidateQueries({ queryKey: ["passport-share", listingId, user?.id ?? null] });
    queryClient.invalidateQueries({ queryKey: ["landlord-applications"] });
  };

  const withdrawMutation = useMutation({
    mutationFn: async () =>
      withdrawApplication({
        data: { shareId: share!.id, reason: withdrawReason.trim() || undefined },
      }),
    onSuccess: (res) => {
      setWithdrawing(false);
      setWithdrawReason("");
      toast.success("Application withdrawn", {
        description: res?.relisted
          ? "The landlord has been told and the property is available again."
          : "The landlord can no longer see your passport for this property.",
      });
      invalidateShare();
    },
    onError: (err: unknown) =>
      toast.error("Couldn't withdraw", {
        description: err instanceof Error ? err.message : "Please try again.",
      }),
  });

  const reapplyMutation = useMutation({
    mutationFn: async () => reapplyApplication({ data: { shareId: share!.id } }),
    onSuccess: () => {
      toast.success("Application re-sent", {
        description: "The landlord has your passport again.",
      });
      invalidateShare();
    },
    onError: (err: unknown) =>
      toast.error("Couldn't re-apply", {
        description: err instanceof Error ? err.message : "Please try again.",
      }),
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { data: inserted, error } = await supabase
        .from("passport_shares")
        .insert({ tenant_id: user.id, listing_id: listingId, status: "pending" })
        .select("id")
        .single();
      if (error) throw error;
      const { data: listing } = await supabase
        .from("property_listings")
        .select("landlord_id, title")
        .eq("id", listingId)
        .maybeSingle();
      return { shareId: inserted.id, listing };
    },
    onSuccess: (res) => {
      toast.success("Passport shared successfully", {
        description: "The landlord has received your verified compliance data.",
        className:
          "border border-verified/30 bg-verified-soft text-verified-foreground",
      });
      queryClient.invalidateQueries({
        queryKey: ["passport-share", listingId, user?.id ?? null],
      });
      queryClient.invalidateQueries({ queryKey: ["landlord-applications"] });
      if (res?.listing?.landlord_id) {
        notify({
          recipient_id: res.listing.landlord_id,
          type: "application_received",
          entity_type: "passport_share",
          entity_id: res.shareId,
          title: "New passport received",
          body: `An applicant shared their self-certified passport with ${res.listing.title ?? "your listing"}.`,
          link_path: "/dashboard/applications",
        });
      }
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

  if (underOffer) {
    return (
      <div className="mt-6 flex flex-col items-start gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="font-display text-base font-semibold tracking-tight text-amber-900">
            This property is currently Under Offer
          </p>
          <p className="mt-0.5 text-sm text-amber-800/80">
            The landlord has accepted an applicant. Applications are paused while the lease is finalised.
          </p>
        </div>
        <button
          type="button"
          disabled
          className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-full bg-amber-200/70 px-5 py-3 font-display text-sm font-semibold text-amber-900 sm:w-auto"
        >
          Applications paused
        </button>
      </div>
    );
  }

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
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-verified px-5 py-3 font-display text-sm font-semibold text-[var(--color-verified-foreground)] shadow-verified transition hover:brightness-95 sm:w-auto"
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

  if (isWithdrawn) {
    return (
      <div className="mt-6 rounded-3xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-base font-semibold tracking-tight">
              Application withdrawn
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              You withdrew this application
              {share?.withdrawn_at
                ? ` on ${new Date(share.withdrawn_at).toLocaleDateString("en-GB")}`
                : ""}
              . You can apply again while the property is available.
            </p>
          </div>
          <button
            type="button"
            onClick={() => reapplyMutation.mutate()}
            disabled={reapplyMutation.isPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-verified px-5 py-3 font-display text-sm font-semibold text-[var(--color-verified-foreground)] transition hover:brightness-95 disabled:opacity-60 sm:w-auto"
          >
            <Sparkles className="h-4 w-4" />
            {reapplyMutation.isPending ? "Sending…" : "Apply again"}
          </button>
        </div>
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
        {sent ? (
          leaseIssued ? (
            <p className="mt-2 text-xs text-muted-foreground">
              A lease has been issued — manage it from your{" "}
              <Link to="/dashboard" className="underline">
                dashboard
              </Link>{" "}
              rather than withdrawing.
            </p>
          ) : withdrawing ? (
            <div className="mt-3 w-full max-w-sm space-y-2">
              <p className="text-xs text-muted-foreground">
                The landlord will no longer see your passport for this property.
              </p>
              <input
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
                maxLength={300}
                placeholder="Reason (optional)"
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => withdrawMutation.mutate()}
                  disabled={withdrawMutation.isPending}
                  className="rounded-full bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                >
                  {withdrawMutation.isPending ? "Withdrawing…" : "Yes, withdraw"}
                </button>
                <button
                  type="button"
                  onClick={() => setWithdrawing(false)}
                  className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium transition hover:bg-secondary"
                >
                  Keep application
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setWithdrawing(true)}
              className="mt-2 text-xs font-medium text-muted-foreground underline underline-offset-2 transition hover:text-foreground"
            >
              Withdraw application
            </button>
          )
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => applyMutation.mutate()}
        disabled={sent || submitting}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 font-display text-sm font-semibold shadow-verified transition sm:w-auto ${
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
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-resting">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function ChipRow({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map((i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-medium text-foreground"
          >
            <Check className="h-3 w-3 text-verified" strokeWidth={3} />
            {i}
          </span>
        ))}
      </div>
    </div>
  );
}

function PropertyDetailsSection({ listing }: { listing: ListingDetail }) {
  const spec: { k: string; v: string }[] = [];
  if (listing.property_type) spec.push({ k: "Property type", v: listing.property_type });
  const beds = bedroomLabel(listing.bedrooms);
  if (beds) spec.push({ k: "Bedrooms", v: beds });
  if (listing.bathrooms) spec.push({ k: "Bathrooms", v: String(listing.bathrooms) });
  if (listing.furnished) spec.push({ k: "Furnished", v: listing.furnished });
  if (listing.parking) spec.push({ k: "Parking", v: listing.parking });
  if (listing.garden) spec.push({ k: "Outside space", v: listing.garden });

  const available = formatAvailableFrom(listing.available_from);
  const outside = [listing.parking, listing.garden].filter(Boolean) as string[];
  const hasAnything =
    spec.length > 0 ||
    available ||
    listing.description ||
    (listing.bills_included?.length ?? 0) > 0 ||
    (listing.features?.length ?? 0) > 0;
  if (!hasAnything) return null;

  return (
    <section className="mt-5 rounded-3xl border border-border bg-surface p-5 shadow-floating sm:p-7">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        The property
      </p>
      <h2 className="mt-1 font-display text-lg font-semibold tracking-tight sm:text-xl">
        Property details
      </h2>

      {spec.length ? (
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {spec.map((s) => (
            <div key={s.k} className="rounded-2xl border border-border bg-surface-muted/50 p-3.5">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {s.k}
              </dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{s.v}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {available || listing.min_tenancy_months !== null ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {available ? <span className="font-medium text-foreground">{available}</span> : null}
          {available ? " · " : null}
          Minimum tenancy: {minTenancyLabel(listing.min_tenancy_months)}
        </p>
      ) : null}

      {listing.description ? (
        <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground">
          {listing.description}
        </p>
      ) : null}

      <ChipRow label="Bills included" items={listing.bills_included ?? []} />
      <ChipRow label="Outside" items={outside} />
      <ChipRow label="Extras" items={listing.features ?? []} />
    </section>
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
          <LogoMark />
          <span className="font-display text-base font-semibold tracking-tight">
            Roost<span className="text-verified">NI</span>
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