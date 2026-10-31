import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  Flame,
  Info,
  Plus,
  Receipt,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  leaseDocumentHtml,
  openPrintable,
  rentReceiptHtml,
  tenancyInfoNoticeHtml,
} from "@/lib/tenancy-docs";
import { ComplianceHealthBar } from "@/components/compliance-health-bar";
import {
  arrearsSummary,
  buildRentSchedule,
  RENT_STATE_LABEL,
  rentStateClasses,
  type RentMonth,
} from "@/lib/rent-schedule";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { CertificatesPanel } from "@/components/property-certificates";
import { PricingBreakdown } from "@/components/pricing-breakdown";
import { emitNotification } from "@/lib/notifications.functions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TenancyEndPanel } from "@/components/tenancy-end-panel";
import { LandlordMaintenanceTab } from "@/components/maintenance-panel";
import {
  fairFuelSentence,
  fuelLabel,
  fuelTankLabel,
  usesFuelTank,
} from "@/lib/listing-details";
import { downloadStoredDoc } from "@/lib/download-doc";

export const Route = createFileRoute("/_authenticated/landlord/manage-tenancy")({
  staticData: { sitemap: false },
  validateSearch: z.object({
    share: z.string().optional(),
    tab: z.string().optional(),
  }),
  head: () => ({
    meta: [
      { title: "Tenancy Workspace — RoostNI" },
      {
        name: "description",
        content:
          "Manage move-in funds, deposit protection, inventory and statutory documents for an executed tenancy.",
      },
    ],
  }),
  component: ManageTenancyPage,
});

type FundStatus = "awaiting" | "pending_verification" | "verified";
type PaymentMethod = "bank_transfer" | "cash" | "standing_order";
type OilLevel = "full" | "three_quarter" | "half" | "quarter" | "empty";

interface ShareRow {
  id: string;
  tenant_id: string | null;
  listing_id: string;
  lease_status: string | null;
  lease_signed_at: string | null;
  lease_signed_name: string | null;
  lease_sent_at: string | null;
  lease_oil_clause: boolean | null;
  lease_kind: string | null;
  lease_document_path: string | null;
  deposit_status: FundStatus;
  rent_status: FundStatus;
  deposit_payment_method: PaymentMethod | null;
  rent_payment_method: PaymentMethod | null;
  deposit_scheme: string | null;
  deposit_cert_number: string | null;
  deposit_protected_at: string | null;
  oil_handover_level: OilLevel | null;
  inventory_completed_at: string | null;
  tenancy_start_date: string | null;
  deposit_cert_path: string | null;
  tenancy_status: string | null;
  final_meter_readings: string | null;
  final_oil_level: string | null;
  final_inspection_submitted_at: string | null;
  final_inspection_response: string | null;
  tenancy_completed_at: string | null;
  tenant: { full_name: string | null } | null;
  listing: {
    id: string;
    title: string;
    address: string | null;
    location: string | null;
    monthly_rent: number | null;
    deposit: number | null;
    heating_type: string | null;
    ni_landlord_reg_number: string | null;
    enforce_empty_in_full_out: boolean | null;
    existing_tenant_name: string | null;
  } | null;
  tin_on_file_reported_at: string | null;
}

interface ReceiptRow {
  id: string;
  share_id: string;
  kind: string;
  amount: number;
  method: string;
  statutory_cash: boolean;
  notes: string | null;
  issued_at: string;
  due_date: string | null;
  period_label: string | null;
}

interface InventoryRow {
  id: string;
  share_id: string;
  room: string;
  condition: string | null;
  notes: string | null;
  photo_path: string | null;
  sort_order: number;
}

const DEFAULT_ROOMS = [
  "Living Room",
  "Kitchen",
  "Bathroom",
  "Bedroom 1",
  "Bedroom 2",
  "Hallway / Exterior",
];

const CONDITIONS = ["Excellent", "Good", "Fair", "Poor"] as const;

const OIL_LEVELS: { value: OilLevel; label: string; pct: number }[] = [
  { value: "full", label: "Full", pct: 1 },
  { value: "three_quarter", label: "3/4", pct: 0.75 },
  { value: "half", label: "1/2", pct: 0.5 },
  { value: "quarter", label: "1/4", pct: 0.25 },
  { value: "empty", label: "Empty", pct: 0 },
];

const DEPOSIT_SCHEMES = ["TDS Northern Ireland", "MyDeposits Northern Ireland"];

function ManageTenancyPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { share: shareId, tab: searchTab } = Route.useSearch();
  const qc = useQueryClient();

  const tenancyQuery = useQuery({
    enabled: !!shareId,
    queryKey: ["tenancy", shareId],
    queryFn: async () => {
      const { data: share, error } = await supabase
        .from("passport_shares")
        .select(
          "id, tenant_id, listing_id, lease_status, tin_on_file_reported_at, lease_signed_at, lease_signed_name, lease_sent_at, lease_oil_clause, lease_kind, lease_document_path, deposit_status, rent_status, deposit_payment_method, rent_payment_method, deposit_scheme, deposit_cert_number, deposit_cert_path, deposit_protected_at, oil_handover_level, inventory_completed_at, tenancy_start_date, tenancy_status, final_meter_readings, final_oil_level, final_inspection_submitted_at, final_inspection_response, tenancy_completed_at, tenant:profiles!tenant_id(full_name), listing:property_listings!listing_id(id, title, address, location, monthly_rent, deposit, heating_type, ni_landlord_reg_number, enforce_empty_in_full_out, existing_tenant_name)",
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
  const tenantName = share?.tenant?.full_name || share?.listing?.existing_tenant_name || "Tenant";
  const listing = share?.listing;
  const address = listing?.address || listing?.location || listing?.title || "Property";
  const rent = Number(listing?.monthly_rent ?? 0);
  const deposit = Number(listing?.deposit ?? rent);
  const fullyExecuted = share?.lease_status === "counter_signed";
  // Tenancy that began before RoostNI: no RoostNI signature, no deadline alarms.
  const isExisting = share?.lease_kind === "existing_agreement";

  const invalidate = () => qc.invalidateQueries({ queryKey: ["tenancy", shareId] });

  // --- Mutations ---------------------------------------------------------
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
    toast("Marked as sent by tenant", {
      description: "Awaiting your verification.",
    });
  };

  const confirmFunds = async (kind: "deposit" | "rent", method: PaymentMethod) => {
    const amount = kind === "deposit" ? deposit : rent;
    const isCash = method === "cash";
    const patch: Partial<ShareRow> =
      kind === "deposit"
        ? { deposit_status: "verified", deposit_payment_method: method }
        : { rent_status: "verified", rent_payment_method: method };
    const { error: updErr } = await supabase
      .from("passport_shares")
      .update(patch as never)
      .eq("id", shareId!);
    if (updErr) {
      toast.error("Could not confirm", { description: updErr.message });
      return;
    }
    const { error: insErr } = await supabase.from("tenancy_receipts").insert({
      share_id: shareId!,
      kind,
      amount,
      method,
      statutory_cash: isCash,
      notes: isCash ? "Statutory cash receipt issued under Private Tenancies Act NI 2022" : null,
    } as never);
    if (insErr) {
      toast.error("Receipt failed", { description: insErr.message });
    } else if (isCash) {
      toast.success("Cash receipt issued", {
        description: "A statutory receipt has been generated and issued to the tenant.",
      });
    } else {
      toast.success("Funds confirmed", {
        description: `£${amount.toLocaleString()} ${kind === "deposit" ? "deposit" : "rent"} marked Paid & Verified.`,
      });
    }
    invalidate();
    if (share?.tenant_id && shareId) {
      emitNotification({
        data: {
          recipient_id: share.tenant_id,
          type: "receipt_confirmed",
          entity_type: "passport_share",
          entity_id: shareId,
          title: kind === "deposit" ? "Deposit confirmed" : "Rent confirmed",
          body: `Your landlord verified £${amount.toLocaleString()} ${kind} for ${address}.`,
          link_path: "/tenant/tenancy",
        },
      }).catch((err) => console.error("[notify]", err));
    }
  };

  const saveDepositCert = (scheme: string, cert: string) => {
    if (!scheme || !cert.trim()) {
      toast.error("Add a scheme and certificate number");
      return;
    }
    updateShareMutation.mutate({
      deposit_scheme: scheme,
      deposit_cert_number: cert.trim(),
      deposit_protected_at: new Date().toISOString(),
    });
    toast.success("Deposit registered", {
      description: `Logged with ${scheme} · cert ${cert.trim()}.`,
    });
    if (share?.tenant_id && shareId) {
      emitNotification({
        data: {
          recipient_id: share.tenant_id,
          type: "deposit_protected",
          entity_type: "passport_share",
          entity_id: shareId,
          title: "Deposit protected",
          body: `Your deposit is protected with ${scheme} (cert ${cert.trim()}).`,
          link_path: "/tenant/tenancy",
        },
      }).catch((err) => console.error("[notify]", err));
    }
  };

  const setOilLevel = (lvl: OilLevel) => {
    updateShareMutation.mutate({ oil_handover_level: lvl });
  };

  // Inventory mutations
  const ensureDefaultInventory = useMutation({
    mutationFn: async () => {
      const rows = DEFAULT_ROOMS.map((room, i) => ({
        share_id: shareId!,
        room,
        sort_order: i,
      }));
      const { error } = await supabase.from("tenancy_inventory_items").insert(rows as never);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  useEffect(() => {
    if (!tenancyQuery.data) return;
    if (inventory.length === 0 && shareId && !ensureDefaultInventory.isPending) {
      ensureDefaultInventory.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenancyQuery.data, shareId]);

  const updateInventoryItem = async (id: string, patch: Partial<InventoryRow>) => {
    const { error } = await supabase
      .from("tenancy_inventory_items")
      .update(patch as never)
      .eq("id", id);
    if (error) {
      toast.error("Could not save", { description: error.message });
      return;
    }
    invalidate();
  };

  const addInventoryRoom = async (room: string) => {
    if (!room.trim()) return;
    const { error } = await supabase.from("tenancy_inventory_items").insert({
      share_id: shareId!,
      room: room.trim(),
      sort_order: inventory.length,
    } as never);
    if (error) {
      toast.error("Could not add room", { description: error.message });
      return;
    }
    invalidate();
  };

  const removeInventoryItem = async (id: string) => {
    const { error } = await supabase.from("tenancy_inventory_items").delete().eq("id", id);
    if (error) {
      toast.error("Could not remove", { description: error.message });
      return;
    }
    invalidate();
  };

  const markInventoryComplete = () => {
    updateShareMutation.mutate({ inventory_completed_at: new Date().toISOString() });
    toast.success("Handover record saved");
  };

  // ---------------------------------------------------------------------
  // Rent schedule (ongoing ledger)
  // ---------------------------------------------------------------------
  const startDate =
    share?.tenancy_start_date ??
    (share?.lease_signed_at ? share.lease_signed_at.slice(0, 10) : null);

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

  const saveStartDate = (value: string) => {
    if (!value) return;
    updateShareMutation.mutate({ tenancy_start_date: value });
    toast.success("Tenancy start date saved", {
      description: "The monthly rent schedule is now live for both of you.",
    });
  };

  const printReceipt = (r: Pick<ReceiptRow, "id" | "amount" | "method" | "period_label" | "issued_at">) => {
    const ok = openPrintable(
      rentReceiptHtml({
        receiptId: r.id,
        tenantName,
        landlordName: profile?.full_name || "Landlord",
        address,
        amount: Number(r.amount),
        method: r.method,
        periodLabel: r.period_label,
        issuedAt: r.issued_at,
      }),
    );
    if (!ok) toast.error("Allow pop-ups to open the receipt");
  };

  const logRentPayment = async (month: RentMonth, method: PaymentMethod, amount: number) => {
    const isCash = method === "cash";
    const { data: inserted, error } = await supabase
      .from("tenancy_receipts")
      .insert({
        share_id: shareId!,
        kind: "rent",
        amount,
        method,
        statutory_cash: isCash,
        due_date: month.dueDate,
        period_label: month.periodLabel,
        notes: isCash ? "Statutory cash receipt issued under Private Tenancies Act NI 2022" : null,
      } as never)
      .select("id, amount, method, period_label, issued_at")
      .single();
    if (error) {
      toast.error("Could not log payment", { description: error.message });
      return;
    }
    toast.success(`${month.periodLabel} rent recorded`, {
      description: isCash
        ? "Your statutory cash receipt is ready to print or save."
        : `£${amount.toLocaleString()} marked as received.`,
    });
    if (isCash && inserted) printReceipt(inserted as unknown as ReceiptRow);
    invalidate();
    if (share?.tenant_id && shareId) {
      emitNotification({
        data: {
          recipient_id: share.tenant_id,
          type: "receipt_confirmed",
          entity_type: "passport_share",
          entity_id: shareId,
          title: `${month.periodLabel} rent receipted`,
          body: `Your landlord recorded £${amount.toLocaleString()} rent for ${month.periodLabel} at ${address}.`,
          link_path: "/tenant/tenancy",
        },
      }).catch((err) => console.error("[notify]", err));
    }
  };

  const sendRentReminder = (month: RentMonth) => {
    if (!share?.tenant_id || !shareId) return;
    const overdue = month.state === "overdue";
    emitNotification({
      data: {
        recipient_id: share.tenant_id,
        type: overdue ? "rent_overdue" : "rent_due_reminder",
        entity_type: "passport_share",
        entity_id: shareId,
        title: overdue
          ? `${month.periodLabel} rent is overdue`
          : `${month.periodLabel} rent is due`,
        body: `£${Number(month.amount).toLocaleString()} for ${address} was due on ${new Date(
          `${month.dueDate}T00:00:00`,
        ).toLocaleDateString("en-GB")}.`,
        link_path: "/tenant/tenancy",
      },
    })
      .then(() => toast.success("Reminder sent to your tenant"))
      .catch((err) => {
        console.error("[notify]", err);
        toast.error("Could not send reminder");
      });
  };

  // Deposit certificate upload
  const uploadDepositCert = async (file: File) => {
    if (!shareId) return;
    const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
    const path = `${shareId}/deposit-certificate-${Date.now()}.${ext}`;
    const buffer = await file.arrayBuffer();
    const { error } = await supabase.storage
      .from("tenancy-documents")
      .upload(path, buffer, { contentType: file.type || "application/pdf", upsert: true });
    if (error) {
      toast.error("Upload failed", { description: error.message });
      return;
    }
    updateShareMutation.mutate({ deposit_cert_path: path });
    toast.success("Certificate uploaded", {
      description: "Your tenant can now view the protection certificate.",
    });
  };

  const openDepositCert = async () => {
    if (!share?.deposit_cert_path) return;
    const { data, error } = await supabase.storage
      .from("tenancy-documents")
      .createSignedUrl(share.deposit_cert_path, 120);
    if (error || !data?.signedUrl) {
      toast.error("Could not open certificate", { description: error?.message });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  // 28-day deposit deadline reminder (at most once per day per tenancy)
  useEffect(() => {
    if (!share || !shareId || !share.tenant_id || isExisting || share.deposit_protected_at) return;
    const anchor = share.lease_signed_at || share.lease_sent_at;
    if (!anchor) return;
    const daysLeft = Math.ceil((new Date(anchor).getTime() + 28 * 864e5 - Date.now()) / 864e5);
    if (daysLeft > 7) return;
    const key = `roost:deposit-reminder:${shareId}:${new Date().toDateString()}`;
    if (typeof window === "undefined" || window.localStorage.getItem(key)) return;
    window.localStorage.setItem(key, "1");
    emitNotification({
      data: {
        recipient_id: share.tenant_id,
        type: "deposit_deadline_approaching",
        entity_type: "passport_share",
        entity_id: shareId,
        title:
          daysLeft < 0
            ? "Deposit protection deadline passed"
            : `Deposit protection due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
        body: `Your deposit for ${address} has not yet been registered with an approved NI scheme.`,
        link_path: "/tenant/tenancy?tab=deposit",
      },
    }).catch((err) => console.error("[notify]", err));
  }, [share, shareId, address, isExisting]);

  return (
    <DashboardShell user={user} profile={profile} activeKey="applications">
      <div className="mb-5">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to properties
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Tenancy Workspace
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold tracking-tight sm:text-2xl">
              {address}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tenant: <span className="font-medium text-foreground">{tenantName}</span> · Rent £
              {rent.toLocaleString()} pcm · Deposit £{deposit.toLocaleString()}
            </p>
          </div>
          {fullyExecuted ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-verified px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-verified-foreground)]">
              <BadgeCheck className="h-3.5 w-3.5" /> Lease executed
            </span>
          ) : isExisting ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Existing tenancy · agreed before RoostNI
            </span>
          ) : null}
        </div>
      </div>

      {!shareId ? (
        <EmptyState onBack={() => navigate({ to: "/dashboard" })} />
      ) : tenancyQuery.isPending ? (
        <div className="rounded-sm border border-border bg-surface p-6 text-sm text-muted-foreground">
          Loading tenancy…
        </div>
      ) : !share ? (
        <EmptyState onBack={() => navigate({ to: "/dashboard" })} />
      ) : (
        <>
        <ComplianceHealthBar
          propertyId={share.listing_id}
          startDate={share.tenancy_start_date}
          tinAcknowledgedAt={share.lease_signed_at}
          existingTenancy={isExisting}
          tinOnFileReportedAt={share.tin_on_file_reported_at}
        />
        <Tabs defaultValue={searchTab || "overview"} className="w-full">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-sm bg-surface-muted p-1">
            <TabsTrigger value="overview" className="rounded-xl px-3 py-2 text-xs sm:text-sm">
              Overview &amp; Rent Ledger
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

          <TabsContent value="overview" className="mt-5 space-y-5">
            {isExisting ? null : (
            <div className="grid gap-4 md:grid-cols-2">
              <FundCard
                title="Security Deposit"
                amount={deposit}
                status={share.deposit_status}
                method={share.deposit_payment_method}
                onMarkSent={() => markSent("deposit")}
                onConfirm={(m) => confirmFunds("deposit", m)}
              />
              <FundCard
                title="First Month's Rent"
                amount={rent}
                status={share.rent_status}
                method={share.rent_payment_method}
                onMarkSent={() => markSent("rent")}
                onConfirm={(m) => confirmFunds("rent", m)}
              />
            </div>
            )}

            <RentScheduleCard
              startDate={share.tenancy_start_date}
              suggestedStart={startDate}
              schedule={schedule}
              arrears={arrears}
              rent={rent}
              onSaveStartDate={saveStartDate}
              onLogPayment={logRentPayment}
              onRemind={sendRentReminder}
            />

            <div className="overflow-hidden rounded-sm border border-border bg-surface">
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
                  Confirmed payments will appear here.
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
                      <span className="flex flex-wrap items-center gap-2">
                        {r.statutory_cash ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-verified-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-verified">
                            <ShieldCheck className="h-3 w-3" />
                            Statutory cash receipt
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-verified-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-verified">
                            <Check className="h-3 w-3" /> Verified
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => printReceipt(r)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground underline-offset-2 hover:underline"
                        >
                          <Download className="h-3 w-3" /> Receipt
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>

          <TabsContent value="deposit" className="mt-5 space-y-5">
            <DepositProtection
              startedAt={share.lease_signed_at || share.lease_sent_at}
              protectedAt={share.deposit_protected_at}
              scheme={share.deposit_scheme}
              cert={share.deposit_cert_number}
              onSave={saveDepositCert}
              certPath={share.deposit_cert_path}
              onUploadCert={uploadDepositCert}
              onOpenCert={openDepositCert}
              existingTenancy={isExisting}
            />
          </TabsContent>

          <TabsContent value="inventory" className="mt-5 space-y-5">
            <OilGaugeCard
              level={share.oil_handover_level}
              fairFuel={!!listing?.enforce_empty_in_full_out}
              heatingType={listing?.heating_type ?? null}
              onSelect={setOilLevel}
            />
            <InventoryList
              items={inventory}
              completedAt={share.inventory_completed_at}
              onUpdate={updateInventoryItem}
              onAdd={addInventoryRoom}
              onRemove={removeInventoryItem}
              onComplete={markInventoryComplete}
            />
          </TabsContent>

          <TabsContent value="maintenance" className="mt-5">
            {listing?.id && user?.id ? (
              <LandlordMaintenanceTab
                propertyId={listing.id}
                landlordId={user.id}
                address={address}
              />
            ) : (
              <div className="rounded-sm border border-border bg-surface p-6 text-sm text-muted-foreground">
                Maintenance tickets will appear once this tenancy is linked to a property.
              </div>
            )}
          </TabsContent>

          <TabsContent value="documents" className="mt-5 space-y-4">
            <DocumentsTab
              share={share}
              tenantName={tenantName}
              landlordName={profile?.full_name || "Landlord"}
              address={address}
              rent={rent}
              deposit={deposit}
              onReportTinOnFile={(on) =>
                updateShareMutation.mutate({ tin_on_file_reported_at: on ? new Date().toISOString() : null })
              }
            />
            {share.listing_id && user?.id ? (
              <section className="rounded-sm border border-border bg-surface p-5">
                <CertificatesPanel propertyId={share.listing_id} landlordId={user.id} />
              </section>
            ) : null}
          </TabsContent>

          <TabsContent value="ending" className="mt-5 space-y-4">
            <TenancyEndPanel
              shareId={share.id}
              role="landlord"
              currentUserId={user?.id ?? null}
              tenantId={share.tenant_id}
              landlordId={user?.id ?? ""}
              tenantName={tenantName}
              landlordName={profile?.full_name || "Landlord"}
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
        </>
      )}
    </DashboardShell>
  );
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function EmptyState({ onBack }: { onBack: () => void }) {
  return (
    <div className="rounded-sm border border-border bg-surface p-8 text-center">
      <p className="font-display text-base font-semibold tracking-tight">No tenancy selected</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Open this workspace from a let-agreed property card so we know which tenancy to manage.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition hover:brightness-110"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to properties
      </button>
    </div>
  );
}

function FundStatusPill({ status }: { status: FundStatus }) {
  if (status === "verified")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-verified px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-verified-foreground)]">
        <ShieldCheck className="h-3 w-3" /> Paid &amp; Verified
      </span>
    );
  if (status === "pending_verification")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-verified-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-verified">
        <Info className="h-3 w-3" /> Pending Landlord Verification
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      Awaiting Payment
    </span>
  );
}

function FundCard({
  title,
  amount,
  status,
  method,
  onMarkSent,
  onConfirm,
}: {
  title: string;
  amount: number;
  status: FundStatus;
  method: PaymentMethod | null;
  onMarkSent: () => void;
  onConfirm: (m: PaymentMethod) => void;
}) {
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<PaymentMethod>("bank_transfer");
  const isVerified = status === "verified";
  const isPending = status === "pending_verification";
  return (
    <div className="rounded-sm border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Move-in funds
          </p>
          <p className="mt-1 font-display text-lg font-semibold tracking-tight">{title}</p>
          <p className="mt-1 font-display text-2xl font-semibold tracking-tight">
            £{amount.toLocaleString()}
          </p>
        </div>
        <FundStatusPill status={status} />
      </div>

      {isVerified ? (
        <div className="mt-4 rounded-sm bg-verified-soft p-3 text-xs text-verified">
          Verified via{" "}
          <span className="font-semibold capitalize">{method?.replace(/_/g, " ") || "—"}</span>
          {method === "cash" ? (
            <p className="mt-1 text-[11px] text-verified">
              Statutory cash receipt has been generated and issued to the tenant under the Private
              Tenancies Act NI 2022.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {status === "awaiting" ? (
            <button
              type="button"
              onClick={onMarkSent}
              className="text-xs font-medium text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-foreground"
            >
              Simulate: tenant marked as sent
            </button>
          ) : null}

          {!open ? (
            <button
              type="button"
              disabled={!isPending}
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" strokeWidth={3} /> Confirm Funds Received
            </button>
          ) : (
            <div className="rounded-sm border border-border bg-surface-muted/40 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Payment method
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(["bank_transfer", "cash", "standing_order"] as PaymentMethod[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setChosen(m)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition ${
                      chosen === m
                        ? "border-verified bg-verified text-[var(--color-verified-foreground)]"
                        : "border-border bg-surface text-foreground hover:bg-secondary"
                    }`}
                  >
                    {m.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
              {chosen === "cash" ? (
                <p className="mt-3 rounded-xl bg-verified-soft px-3 py-2 text-[11px] text-verified">
                  Confirming as cash will generate a statutory receipt and issue it to the tenant
                  (Private Tenancies Act NI 2022).
                </p>
              ) : null}
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onConfirm(chosen);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-verified px-3 py-1.5 text-xs font-semibold text-[var(--color-verified-foreground)] transition hover:brightness-95"
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={3} /> Confirm
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DepositProtection({
  startedAt,
  protectedAt,
  scheme,
  cert,
  onSave,
  certPath,
  onUploadCert,
  onOpenCert,
  existingTenancy = false,
}: {
  existingTenancy?: boolean;
  startedAt: string | null;
  protectedAt: string | null;
  scheme: string | null;
  cert: string | null;
  onSave: (scheme: string, cert: string) => void;
  certPath: string | null;
  onUploadCert: (file: File) => void | Promise<void>;
  onOpenCert: () => void | Promise<void>;
}) {
  const [chosenScheme, setChosenScheme] = useState(scheme || DEPOSIT_SCHEMES[0]);
  const [certInput, setCertInput] = useState(cert || "");

  const start = startedAt ? new Date(startedAt) : new Date();
  const deadlineMs = start.getTime() + 28 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const totalMs = 28 * 24 * 60 * 60 * 1000;
  const remainingMs = deadlineMs - now;
  const elapsedMs = Math.min(totalMs, Math.max(0, now - start.getTime()));
  const progress = elapsedMs / totalMs;
  const daysLeft = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  const hoursLeft = Math.max(0, Math.ceil(remainingMs / (60 * 60 * 1000)));
  const overdue = remainingMs < 0;
  const urgent = !overdue && daysLeft <= 7;
  const isProtected = !!protectedAt;

  const ringColor = isProtected || existingTenancy
    ? "var(--color-verified)"
    : overdue
      ? "#dc2626"
      : urgent
        ? "#d97706"
        : "var(--color-verified)";

  const r = 72;
  const c = 2 * Math.PI * r;
  const offset = existingTenancy && !isProtected ? c : c * (1 - progress);

  return (
    <div className="grid gap-4 md:grid-cols-[260px_1fr]">
      <div className="flex flex-col items-center justify-center rounded-sm border border-border bg-surface p-6">
        <svg width={180} height={180} viewBox="0 0 180 180" className="-rotate-90">
          <circle cx="90" cy="90" r={r} stroke="var(--color-border)" strokeWidth="12" fill="none" />
          <circle
            cx="90"
            cy="90"
            r={r}
            stroke={ringColor}
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 600ms ease" }}
          />
        </svg>
        <div className="-mt-[120px] flex h-[120px] flex-col items-center justify-center text-center">
          {existingTenancy && !isProtected ? (
            <>
              <p className="font-display text-base font-semibold tracking-tight">Existing tenancy</p>
              <p className="px-2 text-[11px] text-muted-foreground">Record the scheme and certificate below</p>
            </>
          ) : isProtected ? (
            <>
              <ShieldCheck className="h-6 w-6 text-verified" />
              <p className="mt-1 font-display text-base font-semibold tracking-tight text-verified">
                Protected
              </p>
            </>
          ) : overdue ? (
            <>
              <p className="font-display text-2xl font-semibold tracking-tight text-[#dc2626]">
                Overdue
              </p>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                28-day deadline passed
              </p>
            </>
          ) : (
            <>
              <p className="font-display text-3xl font-semibold tracking-tight">{daysLeft}</p>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                days left ({hoursLeft}h)
              </p>
            </>
          )}
        </div>
        <p className="mt-4 text-center text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {existingTenancy ? "No countdown for tenancies added from before RoostNI" : "NI Statutory 28-day deadline"}
        </p>
      </div>

      <div className="rounded-sm border border-border bg-surface p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Deposit protection
        </p>
        <h3 className="mt-1 font-display text-lg font-semibold tracking-tight">
          Register the deposit
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Lodge the deposit with an approved NI scheme within 28 days of receipt and log the
          certificate number below.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Scheme
            </label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {DEPOSIT_SCHEMES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setChosenScheme(s)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    chosenScheme === s
                      ? "border-verified bg-verified text-[var(--color-verified-foreground)]"
                      : "border-border bg-surface text-foreground hover:bg-secondary"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Scheme certificate number
            </label>
            <input
              type="text"
              value={certInput}
              onChange={(e) => setCertInput(e.target.value)}
              placeholder="e.g. TDS-NI-12345678"
              className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-verified"
            />
          </div>
          <button
            type="button"
            onClick={() => onSave(chosenScheme, certInput)}
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition hover:brightness-110"
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Save certificate
          </button>

          {isProtected ? (
            <div className="rounded-sm bg-verified-soft p-3 text-xs text-verified">
              Deposit registered with <span className="font-semibold">{scheme}</span> · cert{" "}
              <span className="font-semibold">{cert}</span> on{" "}
              {new Date(protectedAt!).toLocaleDateString("en-GB")}.
            </div>
          ) : null}

          <div className="rounded-sm border border-dashed border-border p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Protection certificate
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Upload the scheme's certificate (PDF or image). Only you and your tenant can open it.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold transition hover:bg-secondary">
                <Plus className="h-3.5 w-3.5" />
                {certPath ? "Replace certificate" : "Upload certificate"}
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onUploadCert(f);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              {certPath ? (
                <button
                  type="button"
                  onClick={() => void onOpenCert()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold transition hover:bg-secondary"
                >
                  <FileText className="h-3.5 w-3.5" /> View certificate
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RentScheduleCard({
  startDate,
  suggestedStart,
  schedule,
  arrears,
  rent,
  onSaveStartDate,
  onLogPayment,
  onRemind,
}: {
  startDate: string | null;
  suggestedStart: string | null;
  schedule: RentMonth[];
  arrears: { monthsBehind: number; total: number };
  rent: number;
  onSaveStartDate: (v: string) => void;
  onLogPayment: (m: RentMonth, method: PaymentMethod, amount: number) => void | Promise<void>;
  onRemind: (m: RentMonth) => void;
}) {
  const [draftStart, setDraftStart] = useState(
    startDate || suggestedStart || new Date().toISOString().slice(0, 10),
  );
  const [openMonth, setOpenMonth] = useState<string | null>(null);

  if (!startDate) {
    return (
      <div className="rounded-sm border border-border bg-surface p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Monthly rent schedule
        </p>
        <h3 className="mt-1 font-display text-lg font-semibold tracking-tight">
          Set the tenancy start date
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          The move-in date anchors every rent due date. Both you and your tenant will see the same
          schedule once it's set.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={draftStart}
            onChange={(e) => setDraftStart(e.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-verified"
          />
          <button
            type="button"
            onClick={() => onSaveStartDate(draftStart)}
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition hover:brightness-110"
          >
            <Check className="h-3.5 w-3.5" /> Save start date
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-sm border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Monthly rent schedule
          </p>
          <p className="mt-1 font-display text-base font-semibold tracking-tight">
            £{rent.toLocaleString()} pcm from{" "}
            {new Date(`${startDate}T00:00:00`).toLocaleDateString("en-GB")}
          </p>
        </div>
        <ClipboardList className="h-5 w-5 text-muted-foreground" />
      </div>

      {arrears.monthsBehind > 0 ? (
        <div className="border-b border-border bg-red-50 px-5 py-3 text-sm text-red-700">
          <span className="font-semibold">£{arrears.total.toLocaleString()} in arrears</span> ·{" "}
          {arrears.monthsBehind} month{arrears.monthsBehind === 1 ? "" : "s"} behind.
        </div>
      ) : (
        <div className="border-b border-border bg-verified-soft px-5 py-3 text-sm text-verified">
          Rent account is up to date.
        </div>
      )}

      <ul className="divide-y divide-border text-sm">
        {schedule.map((m) => (
          <li key={m.periodLabel} className="px-5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-[160px]">
                <p className="font-medium">{m.periodLabel}</p>
                <p className="text-xs text-muted-foreground">
                  Due {new Date(`${m.dueDate}T00:00:00`).toLocaleDateString("en-GB")}
                </p>
              </div>
              <span className="text-sm">£{Number(m.amount).toLocaleString()}</span>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${rentStateClasses(m.state)}`}
              >
                {RENT_STATE_LABEL[m.state]}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {m.state !== "paid" ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMonth(openMonth === m.periodLabel ? null : m.periodLabel)
                      }
                      className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition hover:brightness-110"
                    >
                      <Receipt className="h-3.5 w-3.5" /> Log payment
                    </button>
                    {m.state === "overdue" || m.state === "due" ? (
                      <button
                        type="button"
                        onClick={() => onRemind(m)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold transition hover:bg-secondary"
                      >
                        Send reminder
                      </button>
                    ) : null}
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-verified" />
                    {m.receipt?.statutory_cash ? "Cash receipt issued" : "Receipted"}
                  </span>
                )}
              </div>
            </div>
            {openMonth === m.periodLabel && m.state !== "paid" ? (
              <LogPaymentRow
                defaultAmount={Number(m.amount)}
                onCancel={() => setOpenMonth(null)}
                onSubmit={(method, amount) => {
                  setOpenMonth(null);
                  void onLogPayment(m, method, amount);
                }}
              />
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function LogPaymentRow({
  defaultAmount,
  onSubmit,
  onCancel,
}: {
  defaultAmount: number;
  onSubmit: (method: PaymentMethod, amount: number) => void;
  onCancel: () => void;
}) {
  const [isCash, setIsCash] = useState(false);
  const [otherMethod, setOtherMethod] = useState<PaymentMethod>("bank_transfer");
  const [amount, setAmount] = useState(String(defaultAmount));
  const method: PaymentMethod = isCash ? "cash" : otherMethod;

  return (
    <div className="mt-3 space-y-3 rounded-sm bg-surface-muted/60 p-3">
      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2 shadow-resting">
        <span>
          <span className="block text-sm font-semibold">Cash payment</span>
          <span className="block text-[11px] text-muted-foreground">
            Generates a printable statutory cash receipt
          </span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={isCash}
          aria-label="Cash payment"
          onClick={() => setIsCash((v) => !v)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${isCash ? "bg-verified" : "bg-border"}`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow-resting transition-all ${isCash ? "left-[22px]" : "left-0.5"}`}
          />
        </button>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">£</span>
        <input
          type="number"
          min={0}
          value={amount}
          aria-label="Amount received"
          onChange={(e) => setAmount(e.target.value)}
          className="w-28 rounded-xl border border-border bg-surface px-3 py-1.5 text-sm shadow-resting outline-none focus:border-verified"
        />
        {!isCash
          ? (["bank_transfer", "standing_order"] as PaymentMethod[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setOtherMethod(m)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition ${
                  otherMethod === m
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-surface hover:bg-secondary"
                }`}
              >
                {m.replace(/_/g, " ")}
              </button>
            ))
          : null}
        <button
          type="button"
          onClick={() => onSubmit(method, Number(amount) || defaultAmount)}
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition hover:brightness-110"
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} /> {isCash ? "Record & issue receipt" : "Record"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
      {isCash ? (
        <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> NI law requires a written receipt for
          every cash rent payment. It will open ready to print or save as PDF, and your tenant is
          notified.
        </p>
      ) : null}
    </div>
  );
}

function OilGaugeCard({
  level,
  fairFuel,
  heatingType,
  onSelect,
}: {
  level: OilLevel | null;
  fairFuel: boolean;
  heatingType: string | null;
  onSelect: (l: OilLevel) => void;
}) {
  const pct = OIL_LEVELS.find((l) => l.value === (level ?? "empty"))?.pct ?? 0;
  const angle = -90 + pct * 180; // -90 (empty) to +90 (full)
  const cx = 110;
  const cy = 110;
  const len = 78;
  const x2 = cx + len * Math.cos((angle * Math.PI) / 180);
  const y2 = cy + len * Math.sin((angle * Math.PI) / 180);

  return (
    <div className="rounded-sm border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Utilities
          </p>
          <h3 className="mt-1 font-display text-lg font-semibold tracking-tight">
            {fuelTankLabel(heatingType)} — handover level
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Record the tank level on the day of handover. This is the baseline the tank must be
            returned at under Fair Fuel.
          </p>
        </div>
        <Flame className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-[260px_1fr] md:items-center">
        <div className="grid place-items-center rounded-sm bg-surface-muted/40 p-4">
          <svg width={220} height={140} viewBox="0 0 220 140">
            {/* Arc background */}
            <path
              d="M 22 110 A 88 88 0 0 1 198 110"
              stroke="var(--color-border)"
              strokeWidth="14"
              fill="none"
              strokeLinecap="round"
            />
            {/* Coloured fill arc proportional to level */}
            <path
              d="M 22 110 A 88 88 0 0 1 198 110"
              stroke="var(--color-verified)"
              strokeWidth="14"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${276 * pct} 276`}
              style={{ transition: "stroke-dasharray 400ms ease" }}
            />
            {/* Tick labels */}
            <text x="22" y="128" fontSize="9" textAnchor="middle" fill="currentColor" opacity="0.6">
              E
            </text>
            <text
              x="198"
              y="128"
              fontSize="9"
              textAnchor="middle"
              fill="currentColor"
              opacity="0.6"
            >
              F
            </text>
            {/* Needle */}
            <line
              x1={cx}
              y1={cy}
              x2={x2}
              y2={y2}
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              style={{ transition: "all 400ms ease" }}
            />
            <circle cx={cx} cy={cy} r="6" fill="currentColor" />
          </svg>
          <p className="mt-1 font-display text-base font-semibold tracking-tight">
            {OIL_LEVELS.find((l) => l.value === level)?.label ?? "Not set"}
          </p>
        </div>

        <div>
          <div className="flex flex-wrap gap-1.5">
            {OIL_LEVELS.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => onSelect(l.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  level === l.value
                    ? "border-verified bg-verified text-[var(--color-verified-foreground)]"
                    : "border-border bg-surface text-foreground hover:bg-secondary"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          {fairFuel ? (
            <div className="mt-4 rounded-sm bg-verified-soft p-3 text-xs text-verified">
              Fair Fuel is in force on this lease — {fairFuelSentence(heatingType)}
            </div>
          ) : usesFuelTank(heatingType) ? (
            <div className="mt-4 rounded-sm bg-surface-muted/60 p-3 text-xs text-muted-foreground">
              Property has a {fuelLabel(heatingType)} tank. Recording the handover level avoids
              end-of-tenancy disputes.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InventoryList({
  items,
  completedAt,
  onUpdate,
  onAdd,
  onRemove,
  onComplete,
}: {
  items: InventoryRow[];
  completedAt: string | null;
  onUpdate: (id: string, patch: Partial<InventoryRow>) => void;
  onAdd: (room: string) => void;
  onRemove: (id: string) => void;
  onComplete: () => void;
}) {
  const [newRoom, setNewRoom] = useState("");
  return (
    <div className="rounded-sm border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Inventory
          </p>
          <p className="mt-1 font-display text-base font-semibold tracking-tight">
            Room-by-room condition report
          </p>
        </div>
        <ClipboardList className="h-5 w-5 text-muted-foreground" />
      </div>
      <ul className="divide-y divide-border">
        {items.map((it) => (
          <li
            key={it.id}
            className="grid gap-2 p-4 sm:grid-cols-[160px_180px_1fr_auto] sm:items-start"
          >
            <div className="font-medium">{it.room}</div>
            <select
              value={it.condition ?? ""}
              onChange={(e) => onUpdate(it.id, { condition: e.target.value })}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-verified"
            >
              <option value="">Set condition…</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <textarea
              defaultValue={it.notes ?? ""}
              onBlur={(e) =>
                e.target.value !== (it.notes ?? "")
                  ? onUpdate(it.id, { notes: e.target.value })
                  : undefined
              }
              placeholder="Notes (marks, damage, appliances, meter readings…)"
              className="min-h-[60px] rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-verified"
            />
            <button
              type="button"
              onClick={() => onRemove(it.id)}
              aria-label="Remove room"
              className="grid h-8 w-8 place-items-center self-start justify-self-end rounded-full border border-border text-muted-foreground transition hover:bg-secondary"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
        <div className="flex gap-2">
          <input
            value={newRoom}
            onChange={(e) => setNewRoom(e.target.value)}
            placeholder="Add room (e.g. Garage)"
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-verified"
          />
          <button
            type="button"
            onClick={() => {
              onAdd(newRoom);
              setNewRoom("");
            }}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground transition hover:bg-secondary"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
        <div className="flex items-center gap-2">
          {completedAt ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-verified-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-verified">
              <Check className="h-3 w-3" strokeWidth={3} />
              Saved {new Date(completedAt).toLocaleDateString("en-GB")}
            </span>
          ) : null}
          <button
            type="button"
            onClick={onComplete}
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition hover:brightness-110"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} /> Save handover record
          </button>
        </div>
      </div>
    </div>
  );
}

function DocumentsTab({
  share,
  tenantName,
  landlordName,
  address,
  rent,
  deposit,
  onReportTinOnFile,
}: {
  onReportTinOnFile: (on: boolean) => void;
  share: ShareRow;
  tenantName: string;
  landlordName: string;
  address: string;
  rent: number;
  deposit: number;
}) {
  const printLease = () => {
    const html = leaseDocumentHtml({
      tenantName,
      landlordName,
      address,
      rent,
      deposit,
      tenantSignature: share.lease_signed_name || tenantName,
      tenantSignedAt: share.lease_signed_at,
      oilClause: !!share.lease_oil_clause,
      heatingType: share.listing?.heating_type ?? null,
      counterSigned: share.lease_status === "counter_signed",
    });
    if (!openPrintable(html)) {
      toast.error("Pop-up blocked — please allow pop-ups to download the lease.");
    }
  };

  const isCustom = share.lease_kind === "custom" && !!share.lease_document_path;

  const openCustomLease = async () => {
    if (!share.lease_document_path) return;
    const { data, error } = await supabase.storage
      .from("tenancy-documents")
      .createSignedUrl(share.lease_document_path, 120);
    if (error || !data?.signedUrl) {
      toast.error("Couldn't open the lease document", { description: error?.message });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const downloadCustomLease = async () => {
    if (!share.lease_document_path) return;
    try {
      await downloadStoredDoc(
        share.lease_document_path,
        `${share.listing?.title || "lease"}-signed-agreement.pdf`.replace(/\s+/g, "-"),
      );
      toast.success("Lease download started");
    } catch (err) {
      toast.error("Couldn't download the lease", {
        description: err instanceof Error ? err.message : "Please try again",
      });
    }
  };

  const printNotice = () => {
    const html = tenancyInfoNoticeHtml({
      tenantName,
      landlordName,
      address,
      rent,
      deposit,
      depositScheme: share.deposit_scheme,
      depositCertNumber: share.deposit_cert_number,
      depositProtectedAt: share.deposit_protected_at,
      tenancyStart: share.lease_signed_at,
      heatingType: share.listing?.heating_type ?? null,
      landlordRegNumber: share.listing?.ni_landlord_reg_number ?? null,
      oilClause: !!share.lease_oil_clause,
    });
    if (!openPrintable(html)) {
      toast.error("Pop-up blocked — please allow pop-ups to download the notice.");
    }
  };

  const isExisting = share.lease_kind === "existing_agreement";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {isExisting ? (
        <div className="rounded-sm border border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-sm bg-surface-muted text-foreground">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-base font-semibold tracking-tight">Existing tenancy agreement</p>
              <p className="text-xs text-muted-foreground">Agreed before RoostNI</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            This tenancy was agreed outside RoostNI, so there is no RoostNI signature record. Keep your
            own signed copy safe.
          </p>
        </div>
      ) : (
      <div className="rounded-sm border border-border bg-surface p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-sm bg-verified text-[var(--color-verified-foreground)]">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-base font-semibold tracking-tight">
              {isCustom
                ? "Custom tenancy agreement (uploaded)"
                : "RoostNI Standard NI Tenancy Agreement"}
            </p>
            <p className="text-xs text-muted-foreground">Fully executed · ready to download</p>
          </div>
        </div>
        <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
          <li>
            Tenant signature:{" "}
            <span className="text-foreground">{share.lease_signed_name || "—"}</span>
          </li>
          <li>
            Signed by tenant:{" "}
            <span className="text-foreground">
              {share.lease_signed_at
                ? new Date(share.lease_signed_at).toLocaleString("en-GB")
                : "—"}
            </span>
          </li>
          <li>
            Counter-signed:{" "}
            <span className="text-foreground">
              {share.lease_status === "counter_signed" ? "Yes" : "Pending"}
            </span>
          </li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          {isCustom ? (
            <>
              <button
                type="button"
                onClick={downloadCustomLease}
                className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition hover:brightness-110"
              >
                <Download className="h-3.5 w-3.5" /> Download lease
              </button>
              <button
                type="button"
                onClick={openCustomLease}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-secondary"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Open lease
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={printLease}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition ${
              isCustom
                ? "border border-border bg-surface text-foreground hover:bg-secondary"
                : "bg-foreground text-background hover:brightness-110"
            }`}
          >
            <Download className="h-3.5 w-3.5" />{" "}
            {isCustom ? "Signature record" : "Download / print"}
          </button>
        </div>
      </div>
      )}

      <div className="rounded-sm border border-border bg-surface p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-sm bg-surface-muted text-foreground">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-base font-semibold tracking-tight">
              Tenancy Information Notice
            </p>
            <p className="text-xs text-muted-foreground">Statutory disclosures (NI 2022)</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Auto-fills landlord details, deposit scheme, certificates and repair contacts required
          under the Private Tenancies Act NI 2022.
        </p>
        <button
          type="button"
          onClick={printNotice}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition hover:brightness-110"
        >
          <Download className="h-3.5 w-3.5" /> Generate notice
        </button>
        {isExisting ? (
          <label className="mt-4 flex items-start gap-2 text-xs">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={!!share.tin_on_file_reported_at}
              onChange={(e) => onReportTinOnFile(e.target.checked)}
            />
            <span>
              Landlord says a notice is on file
              <span className="block text-muted-foreground">
                A note for your records only. RoostNI does not check it.
              </span>
            </span>
          </label>
        ) : null}
      </div>

      <PricingBreakdown
        className="md:col-span-2"
        title="What your homes would cost"
      />
    </div>
  );
}
