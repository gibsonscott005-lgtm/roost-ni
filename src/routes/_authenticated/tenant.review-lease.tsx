import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, FileText, ShieldCheck, Check, Loader2, Download, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { emitNotification } from "@/lib/notifications.functions";
import { leaseDocumentHtml, openPrintable } from "@/lib/tenancy-docs";
import { fuelLabel, fuelTankLabel } from "@/lib/listing-details";

export const Route = createFileRoute("/_authenticated/tenant/review-lease")({
  validateSearch: z.object({ share: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Review & Sign Lease — Roost NI" },
      { name: "description", content: "Review and digitally sign your Roost Standard NI lease agreement." },
    ],
  }),
  component: ReviewLeasePage,
});

function ReviewLeasePage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { share: shareId } = Route.useSearch();
  const [typedName, setTypedName] = useState("");
  const [ack, setAck] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const ctxQuery = useQuery({
    enabled: !!shareId,
    queryKey: ["tenant-lease-context", shareId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("passport_shares")
        .select(
          "id, lease_status, lease_oil_clause, lease_signed_name, lease_signed_at, lease_kind, lease_document_path, listing:property_listings!listing_id(title, address, location, monthly_rent, deposit, heating_type)",
        )
        .eq("id", shareId!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as {
        id: string;
        lease_status: string | null;
        lease_oil_clause: boolean | null;
        lease_signed_name: string | null;
        lease_signed_at: string | null;
        lease_kind: string | null;
        lease_document_path: string | null;
        listing: { title: string; address: string | null; location: string | null; monthly_rent: number | null; deposit: number | null; heating_type: string | null } | null;
      } | null;
    },
  });

  const ctx = ctxQuery.data;
  const tenantName = profile?.full_name || "Tenant";
  const propertyAddress = ctx?.listing?.address || ctx?.listing?.location || ctx?.listing?.title || "Property address";
  const monthlyRent = ctx?.listing?.monthly_rent ?? 0;
  const deposit = ctx?.listing?.deposit ?? (Number(monthlyRent) || 0);
  const oilClause = !!ctx?.lease_oil_clause;
  const heatingType = ctx?.listing?.heating_type ?? null;
  const alreadySigned = ctx?.lease_status === "signed_pending_landlord" || ctx?.lease_status === "counter_signed";
  const isCustom = ctx?.lease_kind === "custom" && !!ctx?.lease_document_path;

  const openCustomLease = async () => {
    if (!ctx?.lease_document_path) return;
    const { data, error } = await supabase.storage
      .from("tenancy-documents")
      .createSignedUrl(ctx.lease_document_path, 120);
    if (error || !data?.signedUrl) {
      toast.error("Couldn't open the lease document", { description: error?.message });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const printStandardLease = () => {
    const html = leaseDocumentHtml({
      tenantName,
      landlordName: "Your landlord",
      address: propertyAddress,
      rent: Number(monthlyRent) || 0,
      deposit: Number(deposit) || 0,
      tenantSignature: ctx?.lease_signed_name || tenantName,
      tenantSignedAt: ctx?.lease_signed_at ?? null,
      oilClause,
      heatingType,
      counterSigned: ctx?.lease_status === "counter_signed",
    });
    if (!openPrintable(html)) {
      toast.error("Pop-up blocked — please allow pop-ups to download your copy.");
    }
  };

  const canSubmit =
    !!shareId &&
    !!user &&
    !alreadySigned &&
    ack &&
    typedName.trim().length >= 3 &&
    typedName.trim().toLowerCase() === (profile?.full_name || "").trim().toLowerCase();

  const submit = async () => {
    if (!shareId || !user) return;
    if (!ack) {
      toast.error("Please acknowledge the Tenancy Information Notice");
      return;
    }
    if (typedName.trim().toLowerCase() !== (profile?.full_name || "").trim().toLowerCase()) {
      toast.error("Typed name must match your passport name", {
        description: profile?.full_name ? `Expected: ${profile.full_name}` : undefined,
      });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase
      .from("passport_shares")
      .update({
        lease_status: "signed_pending_landlord",
        lease_signed_name: typedName.trim(),
        lease_signed_at: new Date().toISOString(),
      })
      .eq("id", shareId)
      .eq("tenant_id", user.id);
    setSubmitting(false);
    if (error) {
      toast.error("Couldn't submit signature", { description: error.message });
      return;
    }
    toast.success("🎉 Lease signed — congratulations!", {
      description: "Status: Lease Signed — Pending Landlord Counter-Signature.",
    });
    const { data: share } = await supabase
      .from("passport_shares")
      .select("listing:property_listings!listing_id(landlord_id, title)")
      .eq("id", shareId)
      .maybeSingle<{ listing: { landlord_id: string; title: string | null } | null }>();
    const landlordId = share?.listing?.landlord_id;
    if (landlordId) {
      emitNotification({
        data: {
          recipient_id: landlordId,
          type: "lease_signed_by_tenant",
          entity_type: "passport_share",
          entity_id: shareId,
          title: "Tenant signed lease",
          body: `${tenantName} signed the lease for ${share?.listing?.title ?? propertyAddress}. Counter-sign to execute.`,
          link_path: "/dashboard/applications",
        },
      }).catch((err) => console.error("[notify]", err));
    }
    navigate({ to: "/dashboard" });
  };

  return (
    <DashboardShell user={user} profile={profile} activeKey="passport">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
          </Link>
          <h2 className="mt-2 font-display text-xl font-semibold tracking-tight sm:text-2xl">
            Review &amp; Sign Lease
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {propertyAddress} · Issued by your landlord via Roost
          </p>
        </div>
        {alreadySigned ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-verified px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-verified-foreground)]">
            <ShieldCheck className="h-3.5 w-3.5" /> Signed
          </span>
        ) : null}
      </div>

      {ctxQuery.isLoading ? (
        <div className="rounded-3xl border border-border bg-surface p-10 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          <p className="mt-2">Loading your lease…</p>
        </div>
      ) : !ctx ? (
        <div className="rounded-3xl border border-border bg-surface p-10 text-center text-sm text-muted-foreground">
          Lease not found. Please check the link from your dashboard.
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-3xl border border-border bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Document preview
                </p>
                <p className="mt-0.5 font-display text-base font-semibold tracking-tight">
                  {isCustom
                    ? "Landlord's own tenancy agreement (PDF)"
                    : "Private Residential Tenancy Agreement (NI)"}
                </p>
              </div>
              </div>
              <button
                type="button"
                onClick={isCustom ? openCustomLease : printStandardLease}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary"
              >
                {isCustom ? <ExternalLink className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                {isCustom ? "Open in new tab" : "Download / print"}
              </button>
            </div>

            {isCustom ? (
              <div className="bg-surface-muted/30 px-6 py-8 text-center">
                <p className="text-sm text-foreground/90">
                  Your landlord uploaded their own tenancy agreement instead of the Roost standard
                  template.
                </p>
                <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">
                  Open the PDF and read it in full before signing below. Your signature applies to
                  that document. If anything is unclear, ask your landlord before you sign.
                </p>
                <button
                  type="button"
                  onClick={openCustomLease}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2 text-xs font-semibold text-background transition hover:brightness-110"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Open lease PDF
                </button>
              </div>
            ) : (
            <div className="max-h-[520px] overflow-y-auto bg-surface-muted/30 px-6 py-6">
              <article className="mx-auto max-w-2xl space-y-4 rounded-2xl border border-border bg-surface p-6 text-sm leading-relaxed text-foreground/90 shadow-sm">
                <header className="border-b border-border pb-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Schedule A — Tenancy Particulars
                  </p>
                  <h3 className="mt-1 font-display text-lg font-semibold tracking-tight">
                    Private Residential Tenancy Agreement
                  </h3>
                </header>
                <p>
                  THIS AGREEMENT is made under the <strong>Private Tenancies Act (Northern Ireland) 2022</strong>
                  {" "}between your Landlord (the &ldquo;Landlord&rdquo;) and{" "}
                  <strong>{tenantName}</strong> (the &ldquo;Tenant&rdquo;) in respect of the property
                  known as <strong>{propertyAddress}</strong>.
                </p>
                <Clause n="1" title="Rent">
                  The Tenant shall pay rent of <strong>£{Number(monthlyRent).toLocaleString()}</strong> per
                  calendar month, payable in advance on the 1st of each month by standing order.
                </Clause>
                <Clause n="2" title="Deposit & Protection">
                  A tenancy deposit of <strong>£{Number(deposit).toLocaleString()}</strong> shall be lodged
                  with an approved tenancy deposit scheme within 14 days of receipt, in accordance with the
                  Tenancy Deposit Schemes Regulations (NI) 2012.
                </Clause>
                <Clause n="3" title="Term">
                  The tenancy shall commence on a date to be agreed in writing and continue for an initial
                  term of 12 months, thereafter rolling on a monthly basis subject to statutory notice.
                </Clause>
                <Clause n="4" title="Property Condition">
                  The Landlord shall provide the property in a clean and safe condition with all required
                  certificates (EICR, gas safety where applicable, EPC) supplied to the Tenant on or before
                  the commencement date.
                </Clause>
                {oilClause ? (
                  <Clause n="5" title={`${fuelTankLabel(heatingType)} — Fair Fuel, same level out`}>
                    The {fuelLabel(heatingType)} tank serving <strong>{propertyAddress}</strong>{" "}
                    shall be returned at the end of the tenancy at the level recorded at handover.
                    Full in, full out; where the tank was empty at handover, an empty tank is
                    accepted at the end. Any shortfall against the recorded handover level may be
                    reimbursed at the prevailing market rate.
                  </Clause>
                ) : null}
                <Clause n={oilClause ? "6" : "5"} title="Repairs & Maintenance">
                  The Landlord is responsible for structural repairs and the maintenance of installations
                  for the supply of water, gas, electricity, heating and sanitation as required by statute.
                </Clause>
              </article>
            </div>
            )}
          </div>

          {/* Signature block */}
          <div className="mt-5 rounded-3xl border border-border bg-surface p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Digital signature
            </p>
            <p className="mt-1 font-display text-base font-semibold tracking-tight">
              Sign to accept this tenancy agreement
            </p>

            <label className="mt-4 block">
              <span className="text-xs font-medium text-foreground">
                Type full name to digitally sign
              </span>
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                disabled={alreadySigned || submitting}
                placeholder={profile?.full_name || "Your full name"}
                className="mt-1.5 block w-full rounded-2xl border border-border bg-surface px-4 py-2.5 font-display text-lg italic tracking-wide text-foreground placeholder:text-muted-foreground/60 focus:border-foreground focus:outline-none disabled:opacity-60"
              />
              {profile?.full_name ? (
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  Must match your passport name: <span className="font-medium text-foreground">{profile.full_name}</span>
                </span>
              ) : null}
            </label>

            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-surface-muted/40 p-3.5">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
                disabled={alreadySigned || submitting}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-foreground"
              />
              <span className="text-xs leading-relaxed text-foreground/90">
                I acknowledge receipt of the statutory <strong>Tenancy Information Notice</strong> required
                under Northern Ireland law (Private Tenancies Act (NI) 2022, Section 1), and confirm I have
                read and agree to the lease terms above.
              </span>
            </label>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => navigate({ to: "/dashboard" })}
                className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-medium text-foreground transition hover:bg-secondary"
              >
                Cancel
              </button>
              {alreadySigned ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-verified px-4 py-2 text-xs font-semibold text-[var(--color-verified-foreground)]">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  Signed — awaiting landlord
                </span>
              ) : (
                <button
                  type="button"
                  onClick={submit}
                  disabled={!canSubmit || submitting}
                  className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2 text-xs font-semibold text-background transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  Submit Signed Lease
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </DashboardShell>
  );
}

function Clause({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Clause {n}
      </p>
      <h4 className="mt-0.5 font-display text-sm font-semibold tracking-tight">{title}</h4>
      <p className="mt-1 text-sm text-foreground/85">{children}</p>
    </section>
  );
}