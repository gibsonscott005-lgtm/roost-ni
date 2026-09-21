import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  ClipboardCheck,
  Clock,
  Download,
  Droplet,
  ExternalLink,
  FileText,
  Receipt,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { TenantCertificatesPanel } from "@/components/property-certificates";
import { emitNotification } from "@/lib/notifications.functions";
import { leaseDocumentHtml, openPrintable, tenancyInfoNoticeHtml } from "@/lib/tenancy-docs";
import {
  arrearsSummary,
  buildRentSchedule,
  RENT_STATE_LABEL,
  rentStateClasses,
} from "@/lib/rent-schedule";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TenancyEndPanel } from "@/components/tenancy-end-panel";
import { TenantMaintenanceTab } from "@/components/maintenance-panel";
import { fairFuelSentence, fuelTankLabel, usesFuelTank } from "@/lib/listing-details";
import { downloadStoredDoc } from "@/lib/download-doc";

export const Route = createFileRoute("/_authenticated/tenant/tenancy")({
  staticData: { sitemap: false },
  validateSearch: z.object({
    share: z.string().optional(),
    tab: z.string().optional(),
  }),
  head: () => ({
    meta: [
      { title: "My Tenancy — RoostNI" },
      {
        name: "description",
        content: "Track your move-in funds, deposit protection, inventory and tenancy documents.",
      },
    ],
  }),
  component: TenantTenancyPage,
});

type FundStatus = "awaiting" | "pending_verification" | "verified";
type PaymentMethod = "bank_transfer" | "cash" | "standing_order";
type OilLevel = "full" | "three_quarter" | "half" | "quarter" | "empty";

interface ShareRow {
  id: string;
  tenant_id: string;
  listing_id: string;
  lease_status: string | null;
  lease_signed_at: string | null;
  lease_sent_at: string | null;
  lease_signed_name: string | null;
  lease_oil_clause: boolean | null;
  lease_kind: string | null;
  lease_document_path: string | null;
  deposit_status: FundStatus;
  rent_status: FundStatus;
  deposit_payment_method: PaymentMethod | null;
  rent_payment_method: PaymentMethod | null;
  deposit_scheme: string | null;
  deposit_cert_number: string | null;
  deposit_cert_path: string | null;
  deposit_protected_at: string | null;
  oil_handover_level: OilLevel | null;
  inventory_completed_at: string | null;
  tenancy_start_date: string | null;
  tenancy_status: string | null;
  final_meter_readings: string | null;
  final_oil_level: string | null;
  final_inspection_submitted_at: string | null;
  final_inspection_response: string | null;
  tenancy_completed_at: string | null;
  listing: {
    id: string;
    landlord_id: string;
    title: string;
    address: string | null;
    location: string | null;
    monthly_rent: number | null;
    deposit: number | null;
    heating_type: string | null;
    enforce_empty_in_full_out: boolean | null;
    ni_landlord_reg_number?: string | null;
  } | null;
}

interface ReceiptRow {
  id: string;
  share_id: string;
  kind: string;
  amount: number;
  method: string;
  statutory_cash: boolean;
  issued_at: string;
  due_date?: string | null;
  period_label?: string | null;
}

interface InventoryRow {
  id: string;
  share_id: string;
  room: string;
  condition: string | null;
  notes: string | null;
  sort_order: number;
}

const OIL_PCT: Record<OilLevel, number> = {
  full: 100,
  three_quarter: 75,
  half: 50,
  quarter: 25,
  empty: 0,
};

const OIL_LABEL: Record<OilLevel, string> = {
  full: "Full",
  three_quarter: "3/4",
  half: "1/2",
  quarter: "1/4",
  empty: "Empty",
};

function TenantTenancyPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { share: searchShareId, tab: searchTab } = Route.useSearch();
  const qc = useQueryClient();

  // If no share id provided, auto-pick the tenant's most recent counter-signed share
  const resolvedIdQuery = useQuery({
    enabled: !!user?.id && !searchShareId,
    queryKey: ["tenant-active-share", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("passport_shares")
        .select("id, lease_status, lease_signed_at, shared_at")
        .eq("tenant_id", user!.id)
        .in("lease_status", ["counter_signed", "signed_pending_landlord", "sent_to_tenant"])
        .order("lease_signed_at", { ascending: false, nullsFirst: false })
        .order("shared_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data?.[0]?.id as string | undefined) ?? null;
    },
  });

  const shareId = searchShareId ?? resolvedIdQuery.data ?? undefined;

  const tenancyQuery = useQuery({
    enabled: !!shareId,
    queryKey: ["tenant-tenancy", shareId],
    queryFn: async () => {
      const { data: share, error } = await supabase
        .from("passport_shares")
        .select(
          "id, tenant_id, listing_id, lease_status, lease_signed_at, lease_sent_at, lease_signed_name, lease_oil_clause, lease_kind, lease_document_path, deposit_status, rent_status, deposit_payment_method, rent_payment_method, deposit_scheme, deposit_cert_number, deposit_cert_path, deposit_protected_at, oil_handover_level, inventory_completed_at, tenancy_start_date, tenancy_status, final_meter_readings, final_oil_level, final_inspection_submitted_at, final_inspection_response, tenancy_completed_at, listing:property_listings!listing_id(id, landlord_id, title, address, location, monthly_rent, deposit, heating_type, enforce_empty_in_full_out, ni_landlord_reg_number)",
        )
        .eq("id", shareId!)
        .maybeSingle();
      if (error) throw error;
      const [{ data: receipts }, { data: inventory }] = await Promise.all([
        supabase
          .from("tenancy_receipts")
          .select("*")
          .eq("share_id", shareId!)
          .order("issued_at", { ascending: false }),
        supabase
          .from("tenancy_inventory_items")
          .select("*")
          .eq("share_id", shareId!)
          .order("sort_order", { ascending: true }),
      ]);
      return {
        share: share as unknown as ShareRow | null,
        receipts: (receipts as unknown as ReceiptRow[] | null) ?? [],
        inventory: (inventory as unknown as InventoryRow[] | null) ?? [],
      };
    },
  });

  const share = tenancyQuery.data?.share ?? null;
  const receipts = tenancyQuery.data?.receipts ?? [];
  const inventory = tenancyQuery.data?.inventory ?? [];
  const listing = share?.listing;
  const address = listing?.address || listing?.location || listing?.title || "Your property";
  const rent = Number(listing?.monthly_rent ?? 0);
  const deposit = Number(listing?.deposit ?? rent);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["tenant-tenancy", shareId] });

  const updateShareMutation = useMutation({
    mutationFn: async (patch: Partial<ShareRow>) => {
      const { error } = await supabase
        .from("passport_shares")
        .update(patch as never)
        .eq("id", shareId!);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: unknown) =>
      toast.error("Could not save", {
        description: e instanceof Error ? e.message : "Please try again",
      }),
  });

  const markSent = (kind: "deposit" | "rent") => {
    updateShareMutation.mutate(
      kind === "deposit"
        ? { deposit_status: "pending_verification" }
        : { rent_status: "pending_verification" },
    );
    toast("Marked as sent", { description: "Your landlord will verify receipt." });
    const landlordId = share?.listing?.landlord_id;
    if (landlordId && shareId) {
      emitNotification({
        data: {
          recipient_id: landlordId,
          type: "receipt_logged",
          entity_type: "passport_share",
          entity_id: shareId,
          title: kind === "deposit" ? "Deposit marked as sent" : "Rent marked as sent",
          body: `${profile?.full_name ?? "Your tenant"} flagged ${kind} as sent for ${address}. Confirm receipt.`,
          link_path: `/landlord/manage-tenancy?share=${shareId}`,
        },
      }).catch((err) => console.error("[notify]", err));
    }
  };

  const approveInventory = () => {
    updateShareMutation.mutate({ inventory_completed_at: new Date().toISOString() });
    toast.success("Handover approved", {
      description: "Your sign-off has been logged.",
    });
    const landlordId = share?.listing?.landlord_id;
    if (landlordId && shareId) {
      emitNotification({
        data: {
          recipient_id: landlordId,
          type: "inventory_approved",
          entity_type: "passport_share",
          entity_id: shareId,
          title: "Inventory approved",
          body: `${profile?.full_name ?? "Your tenant"} approved the handover inventory for ${address}.`,
          link_path: `/landlord/manage-tenancy?share=${shareId}`,
        },
      }).catch((err) => console.error("[notify]", err));
    }
  };

  // Deposit 28-day countdown from lease signed (or sent)
  const schedule = useMemo(
    () =>
      buildRentSchedule({
        startDate: share?.tenancy_start_date ?? null,
        monthlyRent: rent,
        receipts,
      }),
    [share?.tenancy_start_date, rent, receipts],
  );
  const arrears = useMemo(() => arrearsSummary(schedule), [schedule]);

  const notifyRentSent = (periodLabel: string, amount: number) => {
    const landlordId = share?.listing?.landlord_id;
    if (!landlordId || !shareId) return;
    emitNotification({
      data: {
        recipient_id: landlordId,
        type: "receipt_logged",
        entity_type: "passport_share",
        entity_id: shareId,
        title: `${periodLabel} rent marked as sent`,
        body: `${profile?.full_name ?? "Your tenant"} says £${amount.toLocaleString()} rent for ${periodLabel} has been paid at ${address}. Confirm receipt.`,
        link_path: `/landlord/manage-tenancy?share=${shareId}`,
      },
    })
      .then(() =>
        toast.success("Landlord notified", {
          description: "They'll confirm and issue a receipt.",
        }),
      )
      .catch((err) => console.error("[notify]", err));
  };

  const openStoredDoc = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("tenancy-documents")
      .createSignedUrl(path, 120);
    if (error || !data?.signedUrl) {
      toast.error("Could not open document", { description: error?.message });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const depositStart = useMemo(
    () => share?.lease_signed_at || share?.lease_sent_at || null,
    [share],
  );
  const daysRemaining = useMemo(() => {
    if (!depositStart) return 28;
    const days = Math.floor(
      (Date.now() - new Date(depositStart).getTime()) / (1000 * 60 * 60 * 24),
    );
    return Math.max(0, 28 - days);
  }, [depositStart]);
  const ringOffset = 251.2 - 251.2 * (daysRemaining / 28);

  // Ensure user is on the tenant side
  useEffect(() => {
    if (profile && profile.account_type === "landlord") {
      navigate({ to: "/dashboard" });
    }
  }, [profile, navigate]);

  return (
    <DashboardShell user={user} profile={profile} activeKey="passport">
      <div className="mb-5">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              My Tenancy
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold tracking-tight sm:text-2xl">
              {address}
            </h2>
            {listing?.location ? (
              <p className="mt-1 text-sm text-muted-foreground">{listing.location}</p>
            ) : null}
          </div>
          {share?.lease_status === "counter_signed" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-verified px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-verified-foreground)]">
              <BadgeCheck className="h-3.5 w-3.5" /> Tenancy active
            </span>
          ) : null}
        </div>
      </div>

      {(!searchShareId && resolvedIdQuery.isFetching) || (!!shareId && tenancyQuery.isPending) ? (
        <div className="rounded-3xl border border-border bg-surface p-6 text-sm text-muted-foreground">
          Loading your tenancy…
        </div>
      ) : !share ? (
        <div className="rounded-3xl border border-border bg-surface p-6 text-sm text-muted-foreground">
          You don't have an active tenancy yet. Once your landlord counter-signs your lease it will
          appear here.
        </div>
      ) : (
        <Tabs defaultValue={searchTab || "overview"} className="w-full">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-2xl bg-surface-muted p-1">
            <TabsTrigger value="overview" className="rounded-xl px-3 py-2 text-xs sm:text-sm">
              Overview &amp; Ledger
            </TabsTrigger>
            <TabsTrigger value="deposit" className="rounded-xl px-3 py-2 text-xs sm:text-sm">
              Deposit Protection
            </TabsTrigger>
            <TabsTrigger value="inventory" className="rounded-xl px-3 py-2 text-xs sm:text-sm">
              Inventory &amp; Utilities
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="rounded-xl px-3 py-2 text-xs sm:text-sm">
              Maintenance
            </TabsTrigger>
            <TabsTrigger value="documents" className="rounded-xl px-3 py-2 text-xs sm:text-sm">
              Documents
            </TabsTrigger>
            <TabsTrigger value="ending" className="rounded-xl px-3 py-2 text-xs sm:text-sm">
              Ending Tenancy
            </TabsTrigger>
          </TabsList>

          {/* Overview & Ledger */}
          <TabsContent value="overview" className="mt-5 space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <TenantFundCard
                title="Security Deposit"
                amount={deposit}
                status={share.deposit_status}
                method={share.deposit_payment_method}
                onMarkSent={() => markSent("deposit")}
              />
              <TenantFundCard
                title="First Month's Rent"
                amount={rent}
                status={share.rent_status}
                method={share.rent_payment_method}
                onMarkSent={() => markSent("rent")}
              />
            </div>

            {share.tenancy_start_date ? (
              <div className="overflow-hidden rounded-3xl border border-border bg-surface">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Monthly rent schedule
                    </p>
                    <p className="mt-1 font-display text-base font-semibold tracking-tight">
                      £{rent.toLocaleString()} pcm from{" "}
                      {new Date(`${share.tenancy_start_date}T00:00:00`).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                {arrears.monthsBehind > 0 ? (
                  <div className="flex items-start gap-2 border-b border-border bg-red-50 px-5 py-3 text-sm text-red-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      <span className="font-semibold">
                        £{arrears.total.toLocaleString()} outstanding
                      </span>{" "}
                      · {arrears.monthsBehind} month{arrears.monthsBehind === 1 ? "" : "s"} behind.
                      Pay your landlord directly, then mark the month as sent.
                    </span>
                  </div>
                ) : (
                  <div className="border-b border-border bg-verified-soft px-5 py-3 text-sm text-verified">
                    Your rent account is up to date.
                  </div>
                )}
                <ul className="divide-y divide-border text-sm">
                  {schedule.map((m) => (
                    <li
                      key={m.periodLabel}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                    >
                      <div className="min-w-[150px]">
                        <p className="font-medium">{m.periodLabel}</p>
                        <p className="text-xs text-muted-foreground">
                          Due {new Date(`${m.dueDate}T00:00:00`).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                      <span>£{Number(m.amount).toLocaleString()}</span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${rentStateClasses(m.state)}`}
                      >
                        {RENT_STATE_LABEL[m.state]}
                      </span>
                      {m.state === "due" || m.state === "overdue" ? (
                        <button
                          type="button"
                          onClick={() => notifyRentSent(m.periodLabel, Number(m.amount))}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold transition hover:bg-secondary"
                        >
                          <Check className="h-3.5 w-3.5" /> Mark as sent
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {m.state === "paid"
                            ? m.receipt?.statutory_cash
                              ? "Cash receipt issued"
                              : "Receipted"
                            : "—"}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="overflow-hidden rounded-3xl border border-border bg-surface">
              <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Rent ledger
                  </p>
                  <p className="mt-1 font-display text-base font-semibold tracking-tight">
                    Receipts &amp; payments
                  </p>
                </div>
                <Receipt className="h-5 w-5 text-muted-foreground" />
              </div>
              {receipts.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                  Confirmed payments will appear here once your landlord verifies them.
                </div>
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {receipts.map((r) => (
                    <li
                      key={r.id}
                      className="grid grid-cols-2 gap-2 px-5 py-3 sm:grid-cols-5 sm:items-center"
                    >
                      <span className="text-xs text-muted-foreground sm:text-sm">
                        {new Date(r.issued_at).toLocaleDateString("en-GB")}
                      </span>
                      <span className="font-medium capitalize">
                        {r.kind === "rent"
                          ? r.period_label
                            ? `Rent · ${r.period_label}`
                            : "First month rent"
                          : r.kind}
                      </span>
                      <span>£{Number(r.amount).toLocaleString()}</span>
                      <span className="capitalize text-muted-foreground">
                        {r.method.replace(/_/g, " ")}
                      </span>
                      <span>
                        {r.statutory_cash ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-verified-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-verified">
                            <ShieldCheck className="h-3 w-3" /> Statutory cash receipt
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-verified-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-verified">
                            <Check className="h-3 w-3" /> Verified
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex gap-3 rounded-2xl border border-verified/30 bg-verified-soft/50 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-verified" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  NI statutory cash receipt rule
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Under the Private Tenancies Act (NI) 2022, your landlord must issue a written
                  receipt for any cash payment within 28 days. RoostNI archives every receipt here
                  automatically.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Deposit protection */}
          <TabsContent value="deposit" className="mt-5 space-y-5">
            {share.deposit_cert_number && share.deposit_scheme ? (
              <div className="flex flex-col items-center gap-4 rounded-3xl border border-verified/30 bg-verified-soft/40 p-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-verified text-[var(--color-verified-foreground)]">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <div>
                  <p className="font-display text-lg font-semibold tracking-tight">
                    Deposit Secured
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{share.deposit_scheme}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Certificate ref:{" "}
                    <span className="font-mono text-foreground">{share.deposit_cert_number}</span>
                  </p>
                  {share.deposit_protected_at ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Registered on{" "}
                      {new Date(share.deposit_protected_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  ) : null}
                  {share.deposit_cert_path ? (
                    <button
                      type="button"
                      onClick={() => void openStoredDoc(share.deposit_cert_path!)}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold transition hover:bg-secondary"
                    >
                      <FileText className="h-3.5 w-3.5" /> View protection certificate
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6 rounded-3xl border border-border bg-surface p-8 text-center">
                <div className="relative h-32 w-32">
                  <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      strokeWidth="8"
                      className="fill-none stroke-border"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray="251.2"
                      strokeDashoffset={ringOffset}
                      className={`fill-none transition-all ${daysRemaining <= 7 ? "stroke-amber-500" : "stroke-verified"}`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-display text-3xl font-semibold tracking-tight">
                      {daysRemaining}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      days left
                    </span>
                  </div>
                </div>
                <div className="max-w-md">
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <Clock className="h-4 w-4" /> Statutory registration window
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Your landlord is required by Northern Ireland law to protect your deposit in an
                    approved scheme within 28 days of receipt.
                  </p>
                </div>
                <p className="rounded-full bg-surface-muted px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
                  Approved NI schemes: TDS NI · MyDeposits NI · LPS NI
                </p>
              </div>
            )}
          </TabsContent>

          {/* Inventory & utilities */}
          <TabsContent value="inventory" className="mt-5 space-y-5">
            {usesFuelTank(listing?.heating_type) ? (
              <div className="rounded-3xl border border-border bg-surface p-5">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Droplet className="h-4 w-4 text-verified" /> Fair Fuel tracker —{" "}
                  {fuelTankLabel(listing?.heating_type)}
                </p>
                {share.oil_handover_level ? (
                  <div className="mt-4 flex flex-wrap items-center gap-6">
                    <OilGauge
                      pct={OIL_PCT[share.oil_handover_level]}
                      label={OIL_LABEL[share.oil_handover_level]}
                    />
                    <div className="flex-1 min-w-[220px]">
                      <p className="text-sm font-semibold text-foreground">
                        Handover fuel level: {OIL_LABEL[share.oil_handover_level]} (
                        {OIL_PCT[share.oil_handover_level]}%)
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        This baseline was logged by your landlord.{" "}
                        {listing?.enforce_empty_in_full_out
                          ? fairFuelSentence(listing?.heating_type)
                          : "You're not bound by a Fair Fuel clause, but returning the tank at the same level is good practice."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Your landlord hasn't logged the handover tank level yet.
                  </p>
                )}
              </div>
            ) : null}

            <div className="overflow-hidden rounded-3xl border border-border bg-surface">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ClipboardCheck className="h-4 w-4 text-muted-foreground" /> Handover inventory
                  checklist
                </p>
              </div>
              {inventory.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                  Your landlord hasn't logged any rooms yet.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {inventory.map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-3 px-5 py-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.room}</p>
                        {item.condition || item.notes ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {[item.condition, item.notes].filter(Boolean).join(" · ")}
                          </p>
                        ) : null}
                      </div>
                      {item.condition ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-verified-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-verified">
                          <Check className="h-3 w-3" /> Logged
                        </span>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Pending
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-3xl border border-border bg-surface p-5">
              {share.inventory_completed_at ? (
                <p className="flex items-center gap-2 text-sm text-foreground">
                  <BadgeCheck className="h-5 w-5 text-verified" />
                  You approved this inventory and fuel gauge on{" "}
                  {new Date(share.inventory_completed_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  .
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Verify handover inventory &amp; fuel gauge
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Review each room and the physical oil tank level. If everything is accurate,
                        sign off below. If you spot any discrepancies, raise them with your landlord
                        first before approving.
                      </p>
                    </div>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={approveInventory}
                      disabled={updateShareMutation.isPending}
                      className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background shadow-sm transition hover:brightness-110 disabled:opacity-60"
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={3} /> Approve &amp; confirm
                      handover
                    </button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Maintenance */}
          <TabsContent value="maintenance" className="mt-5">
            {listing?.id && listing?.landlord_id && user?.id ? (
              <TenantMaintenanceTab
                propertyId={listing.id}
                landlordId={listing.landlord_id}
                tenantId={user.id}
                tenantName={profile?.full_name ?? "Tenant"}
                address={address}
                shareId={shareId}
              />
            ) : (
              <div className="rounded-3xl border border-border bg-surface p-6 text-sm text-muted-foreground">
                Maintenance reporting will unlock once your tenancy is fully linked to a property.
              </div>
            )}
          </TabsContent>

          {/* Documents */}
          <TabsContent value="documents" className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col justify-between rounded-3xl border border-border bg-surface p-5 transition hover:border-foreground/20">
                <div>
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-surface-muted">
                    <FileText className="h-5 w-5 text-foreground" />
                  </div>
                  <p className="font-display text-sm font-semibold tracking-tight">
                    Executed Private Tenancy Agreement
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    The legally binding contract digitally signed by you and your landlord.
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {share.lease_kind === "custom" && share.lease_document_path ? (
                    <>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await downloadStoredDoc(
                              share.lease_document_path!,
                              `${share.listing?.title || "lease"}-signed-agreement.pdf`.replace(/\s+/g, "-"),
                            );
                            toast.success("Lease download started");
                          } catch (err) {
                            toast.error("Couldn't download the lease", {
                              description: err instanceof Error ? err.message : "Please try again",
                            });
                          }
                        }}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-surface-muted"
                      >
                        <Download className="h-3.5 w-3.5" /> Download lease
                      </button>
                      <button
                        type="button"
                        onClick={() => void openStoredDoc(share.lease_document_path!)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-secondary"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Open lease
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        openPrintable(
                          leaseDocumentHtml({
                            tenantName: profile?.full_name || "Tenant",
                            landlordName: "Your landlord",
                            address,
                            rent,
                            deposit,
                            tenantSignature: share.lease_signed_name || profile?.full_name || "",
                            tenantSignedAt: share.lease_signed_at,
                            oilClause: !!share.lease_oil_clause,
                            heatingType: listing?.heating_type ?? null,
                            counterSigned: share.lease_status === "counter_signed",
                          }),
                        )
                      }
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-surface-muted"
                    >
                      <Download className="h-3.5 w-3.5" /> Download printable PDF
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-col justify-between rounded-3xl border border-border bg-surface p-5 transition hover:border-foreground/20">
                <div>
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-verified-soft">
                    <ShieldCheck className="h-5 w-5 text-verified" />
                  </div>
                  <p className="font-display text-sm font-semibold tracking-tight">
                    Tenancy Information Notice (NI)
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    The mandatory statutory notice covering your tenant rights &amp;
                    responsibilities in Northern Ireland.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    openPrintable(
                      tenancyInfoNoticeHtml({
                        tenantName: profile?.full_name || "Tenant",
                        landlordName: "Your landlord",
                        address,
                        rent,
                        deposit,
                        depositScheme: share.deposit_scheme,
                        depositCertNumber: share.deposit_cert_number,
                        depositProtectedAt: share.deposit_protected_at,
                        tenancyStart: share.tenancy_start_date || share.lease_signed_at,
                        heatingType: listing?.heating_type ?? null,
                        landlordRegNumber: listing?.ni_landlord_reg_number ?? null,
                        oilClause: !!share.lease_oil_clause,
                      }),
                    )
                  }
                  className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-surface-muted"
                >
                  <Download className="h-3.5 w-3.5" /> Download notice
                </button>
              </div>
            </div>
            {share.listing_id ? (
              <section className="rounded-3xl border border-border bg-surface p-5">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck className="h-4 w-4 text-verified" /> Safety certificates
                </p>
                <p className="mb-4 mt-1 text-xs text-muted-foreground">
                  Records your landlord has uploaded for this property.
                </p>
                <TenantCertificatesPanel propertyId={share.listing_id} />
              </section>
            ) : null}
          </TabsContent>

          <TabsContent value="ending" className="mt-5 space-y-4">
            <TenancyEndPanel
              shareId={share.id}
              role="tenant"
              currentUserId={user?.id ?? null}
              tenantId={share.tenant_id}
              landlordId={listing?.landlord_id ?? ""}
              tenantName={profile?.full_name || share.lease_signed_name || "Tenant"}
              landlordName="Your landlord"
              address={address}
              listingId={share.listing_id}
              landlordRegNumber={listing?.ni_landlord_reg_number ?? null}
              tenancyStart={share.tenancy_start_date}
              depositAmount={deposit}
              depositScheme={share.deposit_scheme}
              oilClause={!!share.lease_oil_clause || usesFuelTank(listing?.heating_type)}
              heatingType={listing?.heating_type ?? null}
              handoverFuelLevel={share.oil_handover_level}
              tenancyStatus={share.tenancy_status}
              finalMeterReadings={share.final_meter_readings}
              finalOilLevel={share.final_oil_level}
              finalInspectionSubmittedAt={share.final_inspection_submitted_at}
              finalInspectionResponse={share.final_inspection_response}
              tenancyCompletedAt={share.tenancy_completed_at}
              onChanged={invalidate}
            />
          </TabsContent>
        </Tabs>
      )}
    </DashboardShell>
  );
}

function TenantFundCard({
  title,
  amount,
  status,
  method,
  onMarkSent,
}: {
  title: string;
  amount: number;
  status: FundStatus;
  method: PaymentMethod | null;
  onMarkSent: () => void;
}) {
  const badge =
    status === "verified" ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-verified px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-verified-foreground)]">
        <Check className="h-3 w-3" strokeWidth={3} /> Paid &amp; verified
      </span>
    ) : status === "pending_verification" ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
        <Clock className="h-3 w-3" /> Pending landlord verification
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Clock className="h-3 w-3" /> Awaiting payment
      </span>
    );
  return (
    <div className="rounded-3xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {title}
          </p>
          <p className="mt-1 font-display text-2xl font-semibold tracking-tight">
            £{amount.toLocaleString()}
          </p>
          {method ? (
            <p className="mt-1 text-xs capitalize text-muted-foreground">
              {method.replace(/_/g, " ")}
            </p>
          ) : null}
        </div>
        {badge}
      </div>
      {status === "awaiting" ? (
        <button
          type="button"
          onClick={onMarkSent}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background shadow-sm transition hover:brightness-110"
        >
          I've sent this payment
        </button>
      ) : null}
    </div>
  );
}

function OilGauge({ pct, label }: { pct: number; label: string }) {
  return (
    <div className="relative flex h-28 w-28 items-center justify-center">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r="40" strokeWidth="10" className="fill-none stroke-border" />
        <circle
          cx="50"
          cy="50"
          r="40"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray="251.2"
          strokeDashoffset={251.2 - 251.2 * (pct / 100)}
          className={`fill-none transition-all ${pct <= 25 ? "stroke-amber-500" : "stroke-verified"}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-lg font-semibold tracking-tight">{label}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {pct}%
        </span>
      </div>
    </div>
  );
}
