import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  Check,
  Flame,
  Info,
  MapPin,
  PoundSterling,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { PhotoPicker, uploadListingPhotos } from "@/components/listing-photos";
import { CertificatesPanel } from "@/components/property-certificates";
import {
  AvailabilityFields,
  DescriptionField,
  FeaturesFields,
  PropertyBasicsFields,
  emptyListingDetails,
  listingDetailsFromRow,
} from "@/components/listing-detail-fields";
import {
  listingDetailPayload,
  validateListingDetails,
  type ListingDetailInput,
} from "@/lib/listing-details";

export const Route = createFileRoute("/_authenticated/dashboard/listing-edit")({
  validateSearch: z.object({ id: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Edit listing — Roost NI" },
      {
        name: "description",
        content:
          "Update your Northern Ireland property listing, manage photos, publish or unpublish it.",
      },
    ],
  }),
  component: EditListingPage,
});

const HEATING_OPTIONS = ["Oil", "Gas", "Electric"] as const;
const TENANT_PREFS = [
  "No pets",
  "Non-smokers",
  "Professionals only",
  "Students considered",
  "Couples welcome",
  "Long-term tenancy",
];

const inputCx =
  "mt-1.5 block h-11 w-full rounded-xl border border-border bg-surface-muted px-3.5 text-sm text-foreground placeholder:text-muted-foreground/80 transition focus:border-verified/40 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-verified/20";

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 rounded-3xl border border-border bg-surface p-5">
      <h3 className="mb-4 font-display text-base font-semibold tracking-tight">{title}</h3>
      {children}
    </section>
  );
}

function EditListingPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const listingQuery = useQuery({
    enabled: !!id && !!user?.id,
    queryKey: ["landlord-listing", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_listings")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const linkedQuery = useQuery({
    enabled: !!id,
    queryKey: ["listing-linked-shares", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("passport_shares")
        .select("id, status, lease_status")
        .eq("listing_id", id!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const listing = listingQuery.data as Record<string, any> | null | undefined;
  const shares = linkedQuery.data ?? [];
  const hasTenancy = shares.some((s) => s.lease_status === "counter_signed");
  const hasApplications = shares.length > 0;

  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState("");
  const [rent, setRent] = useState("");
  const [deposit, setDeposit] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [heating, setHeating] = useState<string>("Oil");
  const [fuelPolicy, setFuelPolicy] = useState(true);
  const [prefs, setPrefs] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [details, setDetails] = useState<ListingDetailInput>(emptyListingDetails);

  useEffect(() => {
    if (!listing) return;
    setTitle(listing.title ?? "");
    setAddress(listing.address ?? "");
    setLocation(listing.location ?? "");
    setRent(String(listing.monthly_rent ?? ""));
    setDeposit(String(listing.deposit ?? ""));
    setRegNumber(listing.ni_landlord_reg_number ?? "");
    setHeating(listing.heating_type ?? "Oil");
    setFuelPolicy(!!listing.enforce_empty_in_full_out);
    setPrefs(listing.tenant_preferences ?? []);
    setExistingPhotos(listing.photo_urls ?? []);
    setDetails(listingDetailsFromRow(listing as never));
  }, [listing]);

  const togglePref = (label: string) =>
    setPrefs((s) => (s.includes(label) ? s.filter((x) => x !== label) : [...s, label]));

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["landlord-listing", id] });
    await qc.invalidateQueries({ queryKey: ["landlord-listings"] });
    await qc.invalidateQueries({ queryKey: ["listings"] });
  };

  const save = async (publish?: boolean) => {
    if (!user || !id || saving) return;
    const detailError = validateListingDetails(details);
    if (detailError) {
      toast.error("Check the property details", { description: detailError });
      return;
    }
    setSaving(true);
    try {
      let photoPaths = existingPhotos;
      if (newPhotos.length > 0) {
        const uploaded = await uploadListingPhotos(user.id, newPhotos);
        photoPaths = [...existingPhotos, ...uploaded];
      }
      const { error } = await supabase
        .from("property_listings")
        .update({
          title,
          address,
          location: location || null,
          monthly_rent: Number(rent),
          deposit: Number(deposit),
          ni_landlord_reg_number: regNumber,
          heating_type: heating,
          enforce_empty_in_full_out: heating === "Oil" ? fuelPolicy : false,
          tenant_preferences: prefs,
          photo_urls: photoPaths,
          ...listingDetailPayload(details),
          ...(publish === undefined ? {} : { is_published: publish }),
        } as never)
        .eq("id", id);
      if (error) throw error;
      setNewPhotos([]);
      setExistingPhotos(photoPaths);
      toast.success(
        publish === undefined
          ? "Listing updated"
          : publish
            ? "Listing published"
            : "Listing unpublished",
        {
          description:
            publish === false
              ? "It's hidden from the public feed but kept in your account."
              : "Your changes are live.",
        },
      );
      await invalidate();
    } catch (err: unknown) {
      toast.error("Could not save listing", {
        description: err instanceof Error ? err.message : "Please try again",
      });
    } finally {
      setSaving(false);
    }
  };

  const removeListing = async () => {
    if (!id) return;
    if (hasApplications) {
      toast.error("This listing has applications", {
        description: "Decline or complete them before deleting the property.",
      });
      return;
    }
    const { error } = await supabase.from("property_listings").delete().eq("id", id);
    if (error) {
      toast.error("Could not delete listing", { description: error.message });
      return;
    }
    toast.success("Listing deleted");
    await invalidate();
    navigate({ to: "/dashboard" });
  };

  return (
    <DashboardShell user={user} profile={profile} activeKey="properties">
      <div className="mb-5">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to properties
        </Link>
        <h2 className="mt-2 font-display text-xl font-semibold tracking-tight sm:text-2xl">
          Edit listing
        </h2>
      </div>

      {!id ? (
        <div className="rounded-3xl border border-border bg-surface p-6 text-sm text-muted-foreground">
          No listing selected. Pick a property from your dashboard to edit it.
        </div>
      ) : authLoading || listingQuery.isPending ? (
        <div className="rounded-3xl border border-border bg-surface p-6 text-sm text-muted-foreground">
          Loading listing…
        </div>
      ) : !listing ? (
        <div className="rounded-3xl border border-border bg-surface p-6 text-sm text-muted-foreground">
          We couldn't find that listing.
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <Card title="Basic info">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Property title" className="sm:col-span-2">
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputCx}
                />
              </Field>
              <Field label="Address" className="sm:col-span-2">
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className={`${inputCx} pl-9`}
                  />
                </div>
              </Field>
              <Field label="Town / area">
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={inputCx}
                />
              </Field>
              <Field label="NI Landlord Registration Number">
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    required
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value.toUpperCase())}
                    className={`${inputCx} pl-9 uppercase tracking-wider`}
                  />
                </div>
              </Field>
              <Field label="Monthly rent">
                <div className="relative">
                  <PoundSterling className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    required
                    inputMode="numeric"
                    value={rent}
                    onChange={(e) => setRent(e.target.value.replace(/[^0-9.]/g, ""))}
                    className={`${inputCx} pl-9`}
                  />
                </div>
              </Field>
              <Field label="Security deposit">
                <div className="relative">
                  <PoundSterling className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    required
                    inputMode="numeric"
                    value={deposit}
                    onChange={(e) => setDeposit(e.target.value.replace(/[^0-9.]/g, ""))}
                    className={`${inputCx} pl-9`}
                  />
                </div>
              </Field>
            </div>
          </Card>

          <Card title="Property basics">
            <PropertyBasicsFields value={details} onChange={setDetails} />
          </Card>

          <Card title="Availability">
            <AvailabilityFields value={details} onChange={setDetails} />
          </Card>

          <Card title="Description">
            <DescriptionField value={details} onChange={setDetails} />
          </Card>

          <Card title="Features & running costs">
            <FeaturesFields value={details} onChange={setDetails} />
          </Card>

          <Card title="Photos">
            <PhotoPicker
              files={newPhotos}
              onChange={setNewPhotos}
              existing={existingPhotos}
              onRemoveExisting={(path) =>
                setExistingPhotos((s) => s.filter((p) => p !== path))
              }
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Removed photos are cleared when you save your changes.
            </p>
          </Card>

          <Card title="Heating & Fair Fuel">
            <div className="flex flex-wrap gap-2">
              {HEATING_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setHeating(opt)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                    heating === opt
                      ? "border-verified bg-verified text-[var(--color-verified-foreground)]"
                      : "border-border bg-surface hover:bg-secondary"
                  }`}
                >
                  <Flame className="h-3.5 w-3.5" /> {opt}
                </button>
              ))}
            </div>
            {heating === "Oil" ? (
              <button
                type="button"
                onClick={() => setFuelPolicy((v) => !v)}
                aria-pressed={fuelPolicy}
                className="mt-4 flex w-full items-center justify-between gap-4 rounded-2xl border border-verified/30 bg-verified-soft/40 px-4 py-3 text-left"
              >
                <span>
                  <span className="block text-sm font-semibold">
                    Enforce Fair Fuel (Empty-In / Full-Out)
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Matches tenants who already accept these oil terms.
                  </span>
                </span>
                <span
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                    fuelPolicy ? "bg-verified" : "bg-border"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-surface shadow transition ${
                      fuelPolicy ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </span>
              </button>
            ) : (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-surface-muted px-3 py-2.5 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Fair Fuel applies to oil-heated
                properties only.
              </p>
            )}
          </Card>

          <Card title="Tenant requirements">
            <div className="flex flex-wrap gap-2">
              {TENANT_PREFS.map((label) => {
                const active = prefs.includes(label);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => togglePref(label)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                      active
                        ? "border-verified bg-verified text-[var(--color-verified-foreground)]"
                        : "border-border bg-surface hover:bg-secondary"
                    }`}
                  >
                    {active ? <Check className="h-3.5 w-3.5" /> : null}
                    {label}
                  </button>
                );
              })}
            </div>
          </Card>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-[var(--color-primary-foreground)] transition hover:brightness-110 disabled:opacity-60"
            >
              <Check className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void save(!listing.is_published)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-semibold transition hover:bg-secondary disabled:opacity-60"
            >
              {listing.is_published ? "Unpublish listing" : "Publish listing"}
            </button>
            <div className="ml-auto flex items-center gap-2">
              {confirmDelete ? (
                <>
                  <span className="text-xs text-muted-foreground">Delete permanently?</span>
                  <button
                    type="button"
                    onClick={() => void removeListing()}
                    className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Yes, delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-full px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={hasApplications}
                  title={
                    hasTenancy
                      ? "This property has an active tenancy"
                      : hasApplications
                        ? "This property has applications"
                        : undefined
                  }
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete listing
                </button>
              )}
            </div>
          </div>
          {hasApplications ? (
            <p className="mt-3 text-xs text-muted-foreground">
              {hasTenancy
                ? "This property has an executed tenancy, so it can't be deleted."
                : "This property has applications, so it can't be deleted yet. Unpublish it instead."}
            </p>
          ) : null}
        </form>
      )}
    </DashboardShell>
  );
}