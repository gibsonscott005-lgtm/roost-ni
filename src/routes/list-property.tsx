import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Check, Flame, MapPin, PoundSterling, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { posthog } from "@/integrations/posthog/client";
import { notifyListingPublished } from "@/lib/listing-alerts.functions";
import { HEATING_OPTIONS, usesFuelTank } from "@/lib/listing-details";

const DRAFT_KEY = "roostni_listing_draft";
const NI_POSTCODE = /^BT\d{1,2}\s?\d[A-Z]{2}$/i;

interface Draft {
  address: string;
  postcode: string;
  rent: string;
  deposit: string;
  heating: string;
  regNumber: string;
}
const EMPTY: Draft = { address: "", postcode: "", rent: "", deposit: "", heating: "Oil", regNumber: "" };

export const Route = createFileRoute("/list-property")({
  head: () => ({
    meta: [
      { title: "List a property free in Northern Ireland — RoostNI" },
      {
        name: "description",
        content:
          "Start your Northern Ireland rental listing now — no account needed until you publish. No agent fees, deposits checked against the one-month cap.",
      },
      { property: "og:title", content: "List a property free in Northern Ireland — RoostNI" },
      {
        property: "og:description",
        content: "Fill in your listing first, sign up only when you publish. Free, with zero agent commissions.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://roostni.co.uk/list-property" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://roostni.co.uk/list-property" }],
  }),
  component: ListPropertyPage,
});

const inputCx =
  "mt-1.5 block h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground shadow-resting placeholder:text-muted-foreground/80 focus:border-verified/40 focus:outline-none focus:ring-2 focus:ring-verified/20";

function ListPropertyPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const notifyPublished = useServerFn(notifyListingPublished);
  const [d, setD] = useState<Draft>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setD({ ...EMPTY, ...(JSON.parse(raw) as Partial<Draft>) });
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  }, [d, hydrated]);

  const set = (k: keyof Draft) => (v: string) => setD((s) => ({ ...s, [k]: v }));
  const rentNum = Number(d.rent);
  const depositNum = Number(d.deposit);
  const overCap = rentNum > 0 && depositNum > rentNum;
  const postcodeOk = NI_POSTCODE.test(d.postcode.trim());
  const ready = d.address.trim().length > 3 && postcodeOk && rentNum > 0 && depositNum >= 0 && d.deposit !== "" && !overCap;
  const isTenant = profile?.account_type === "tenant";

  const publish = async () => {
    if (!ready || publishing) return;
    if (!user) {
      posthog.capture("list_property_auth_gate", { has_draft: true });
      navigate({ to: "/auth", search: { role: "landlord", next: "/list-property" } });
      return;
    }
    if (isTenant) return;
    setPublishing(true);
    try {
      const street =
        d.address.split(",")[0]!.replace(/^\s*(flat|apt|apartment|unit)?\s*[\d\w/-]*\d[\w/-]*\s+/i, "").trim() ||
        d.address.trim();
      const { data: created, error } = await supabase
        .from("property_listings")
        .insert({
          landlord_id: user.id,
          title: `Property on ${street}`,
          address: d.address.trim(),
          location: d.postcode.trim().toUpperCase(),
          monthly_rent: rentNum,
          deposit: depositNum,
          ni_landlord_reg_number: d.regNumber.trim() || "Pending",
          heating_type: d.heating,
          enforce_empty_in_full_out: usesFuelTank(d.heating),
          tenant_preferences: [],
          is_published: true,
          occupancy_status: "vacant",
          photo_urls: [],
        } as never)
        .select("id")
        .single();
      if (error) throw error;
      const id = (created as { id: string }).id;
      void notifyPublished({ data: { listingId: id } }).catch(() => {});
      localStorage.removeItem(DRAFT_KEY);
      posthog.capture("list_property_published", { listing_id: id });
      toast.success("Your property is live", { description: "Add photos and safety certificates next." });
      navigate({ to: "/dashboard/listing-edit", search: { id } });
    } catch (err) {
      toast.error("Could not publish", { description: err instanceof Error ? err.message : "Please try again" });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-xl px-4 pb-24 pt-6 sm:pt-10">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to home
        </Link>
        <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">List a property</p>
        <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Start your listing — no account needed yet
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fill in the basics now. We'll only ask you to sign up when you publish. Your draft is saved on this device.
        </p>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-verified-soft px-3 py-1 text-xs font-medium text-verified">
          <ShieldCheck className="h-3.5 w-3.5" /> Free direct management • Zero agent commissions
        </p>

        <section className="mt-5 space-y-4 rounded-3xl border border-border bg-surface p-5 shadow-floating sm:p-6">
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Address</span>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={d.address} onChange={(e) => set("address")(e.target.value)} placeholder="12 Lisburn Road, Belfast" className={`${inputCx} pl-9`} />
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Postcode (NI)</span>
            <input value={d.postcode} onChange={(e) => set("postcode")(e.target.value.toUpperCase())} placeholder="BT9 6AA" className={inputCx} />
            {d.postcode && !postcodeOk ? (
              <span className="mt-1 block text-xs text-destructive">Enter a Northern Ireland postcode starting with BT.</span>
            ) : null}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Monthly rent</span>
              <div className="relative">
                <PoundSterling className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  inputMode="numeric"
                  value={d.rent}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9.]/g, "");
                    // Deposit follows the rent until the landlord sets their own figure.
                    setD((s) => ({
                      ...s,
                      rent: v,
                      deposit: s.deposit === "" || s.deposit === s.rent || Number(s.deposit) > Number(v) ? v : s.deposit,
                    }));
                  }}
                  className={`${inputCx} pl-9`}
                />
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Deposit</span>
              <div className="relative">
                <PoundSterling className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input inputMode="numeric" value={d.deposit} onChange={(e) => set("deposit")(e.target.value.replace(/[^0-9.]/g, ""))} className={`${inputCx} pl-9`} />
              </div>
            </label>
          </div>
          <p className={`text-xs ${overCap ? "text-destructive" : "text-muted-foreground"}`}>
            {overCap
              ? `Under the Private Tenancies Act (NI) 2022 the deposit can't exceed one month's rent (£${rentNum.toLocaleString("en-GB")}).`
              : "Deposits in Northern Ireland are capped at one month's rent."}
          </p>
          <div>
            <span className="text-xs font-semibold text-muted-foreground">Heating</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {HEATING_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => set("heating")(opt)}
                  className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition ${
                    d.heating === opt ? "border-verified bg-verified text-[var(--color-verified-foreground)]" : "border-border bg-surface hover:bg-secondary"
                  }`}
                >
                  <Flame className="h-3.5 w-3.5" /> {opt}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">NI Landlord Registration Number (optional)</span>
            <input value={d.regNumber} onChange={(e) => set("regNumber")(e.target.value.toUpperCase())} placeholder="Leave blank to mark as Pending" className={inputCx} />
          </label>
        </section>

        <div className="mt-5 rounded-3xl border border-verified/25 bg-verified-soft/50 p-5">
          {isTenant ? (
            <p className="text-sm text-muted-foreground">
              You're signed in with a tenant account. Listing properties needs a landlord account.
            </p>
          ) : (
            <>
              <p className="text-sm font-semibold text-foreground">
                {user ? "Ready to go live?" : "Last step: create your free landlord account"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {user
                  ? "Publish now, then add photos and safety certificates from your dashboard."
                  : "Your details are kept — we'll bring you straight back here to publish."}
              </p>
              <button
                type="button"
                onClick={() => void publish()}
                disabled={!ready || publishing || loading}
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-verified px-5 py-3 font-display text-sm font-semibold text-[var(--color-verified-foreground)] shadow-verified transition hover:-translate-y-0.5 hover:brightness-95 disabled:translate-y-0 disabled:opacity-50"
              >
                {user ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                {publishing ? "Publishing…" : user ? "Publish listing" : "Sign up free & publish"}
              </button>
              {!user ? (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Already have an account?{" "}
                  <Link to="/auth" search={{ role: "landlord", next: "/list-property", mode: "login" }} className="font-medium text-verified hover:underline">
                    Sign in to publish
                  </Link>
                </p>
              ) : null}
            </>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Not sure you're compliant?{" "}
          <Link to="/audit" className="font-medium text-verified hover:underline">Take the free 5-question check</Link>
        </p>
      </main>
    </div>
  );
}
