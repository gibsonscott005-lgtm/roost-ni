import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  ClipboardList,
  Download,
  FileText,
  Flame,
  Info,
  Plus,
  Receipt,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { leaseDocumentHtml, openPrintable, tenancyInfoNoticeHtml } from "@/lib/tenancy-docs";
import {
  arrearsSummary,
  buildRentSchedule,
  RENT_STATE_LABEL,
  rentStateClasses,
  type RentMonth,
} from "@/lib/rent-schedule";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { emitNotification } from "@/lib/notifications.functions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LandlordMaintenanceTab } from "@/components/maintenance-panel";

export const Route = createFileRoute("/_authenticated/landlord/manage-tenancy")({
  validateSearch: z.object({
    share: z.string().optional(),
    tab: z.string().optional(),
  }),
  head: () => ({
    meta: [
      { title: "Tenancy Workspace — Roost NI" },
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
  tenant_id: string;
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
  } | null;
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

const DEPOSIT_SCHEMES = ["TDS NI", "MyDeposits NI", "LPS NI"];

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
          "id, tenant_id, listing_id, lease_status, lease_signed_at, lease_signed_name, lease_sent_at, lease_oil_clause, lease_kind, lease_document_path, deposit_status, rent_status, deposit_payment_method, rent_payment_method, deposit_scheme, deposit_cert_number, deposit_protected_at, oil_handover_level, inventory_completed_at, tenant:profiles!tenant_id(full_name), listing:property_listings!listing_id(id, title, address, location, monthly_rent, deposit, heating_type, ni_landlord_reg_number, enforce_empty_in_full_out)",
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
  const tenantName = share?.tenant?.full_name || "Tenant";
  const listing = share?.listing;
  const address = listing?.address || listing?.location || listing?.title || "Property";
  const rent = Number(listing?.monthly_rent ?? 0);
  const deposit = Number(listing?.deposit ?? rent);
  const fullyExecuted = share?.lease_status === "counter_signed";

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

  const confirmFunds = async (
    kind: "deposit" | "rent",
    method: PaymentMethod,
  ) => {
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
      notes: isCash
        ? "Statutory cash receipt issued under Private Tenancies Act NI 2022"
        : null,
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
      const { error } = await supabase
        .from("tenancy_inventory_items")
        .insert(rows as never);
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
    const { error } = await supabase
      .from("tenancy_inventory_items")
      .delete()
      .eq("id", id);
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
          ) : null}
        </div>
      </div>

      {!shareId ? (
        <EmptyState onBack={() => navigate({ to: "/dashboard" })} />
      ) : tenancyQuery.isPending ? (
        <div className="rounded-3xl border border-border bg-surface p-6 text-sm text-muted-foreground">
          Loading tenancy…
        </div>
      ) : !share ? (
        <EmptyState onBack={() => navigate({ to: "/dashboard" })} />
      ) : (
        <Tabs defaultValue={searchTab || "overview"} className="w-full">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-2xl bg-surface-muted p-1">
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
          </TabsList>

          <TabsContent value="overview" className="mt-5 space-y-5">
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
                        {r.kind === "rent" ? "First month rent" : r.kind}
                      </span>
                      <span>£{Number(r.amount).toLocaleString()}</span>
                      <span className="capitalize text-muted-foreground">
                        {r.method.replace(/_/g, " ")}
                      </span>
                      <span>
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
              <div className="rounded-3xl border border-border bg-surface p-6 text-sm text-muted-foreground">
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
            />
          </TabsContent>
        </Tabs>
      )}
    </DashboardShell>
  );
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function EmptyState({ onBack }: { onBack: () => void }) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-8 text-center">
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
    <div className="rounded-3xl border border-border bg-surface p-5">
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
        <div className="mt-4 rounded-2xl bg-verified-soft p-3 text-xs text-verified">
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
            <div className="rounded-2xl border border-border bg-surface-muted/40 p-3">
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
}: {
  startedAt: string | null;
  protectedAt: string | null;
  scheme: string | null;
  cert: string | null;
  onSave: (scheme: string, cert: string) => void;
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

  const ringColor = isProtected
    ? "var(--color-verified)"
    : overdue
      ? "#dc2626"
      : urgent
        ? "#d97706"
        : "var(--color-verified)";

  const r = 72;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - progress);

  return (
    <div className="grid gap-4 md:grid-cols-[260px_1fr]">
      <div className="flex flex-col items-center justify-center rounded-3xl border border-border bg-surface p-6">
        <svg width={180} height={180} viewBox="0 0 180 180" className="-rotate-90">
          <circle
            cx="90"
            cy="90"
            r={r}
            stroke="var(--color-border)"
            strokeWidth="12"
            fill="none"
          />
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
          {isProtected ? (
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
          NI Statutory 28-day deadline
        </p>
      </div>

      <div className="rounded-3xl border border-border bg-surface p-5">
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
            <div className="rounded-2xl bg-verified-soft p-3 text-xs text-verified">
              Deposit registered with <span className="font-semibold">{scheme}</span> · cert{" "}
              <span className="font-semibold">{cert}</span> on{" "}
              {new Date(protectedAt!).toLocaleDateString("en-GB")}.
            </div>
          ) : null}
        </div>
      </div>
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
    <div className="rounded-3xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Utilities
          </p>
          <h3 className="mt-1 font-display text-lg font-semibold tracking-tight">
            Domestic Heating Oil Handover Level
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Record the oil tank level on the day of handover. This locks in the baseline for any
            Fair Fuel reconciliation.
          </p>
        </div>
        <Flame className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-[260px_1fr] md:items-center">
        <div className="grid place-items-center rounded-2xl bg-surface-muted/40 p-4">
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
            <text x="22" y="128" fontSize="9" textAnchor="middle" fill="currentColor" opacity="0.6">E</text>
            <text x="198" y="128" fontSize="9" textAnchor="middle" fill="currentColor" opacity="0.6">F</text>
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
            <div className="mt-4 rounded-2xl bg-verified-soft p-3 text-xs text-verified">
              Fair Fuel is in force on this lease — tank handed over <strong>Empty</strong> at
              start should be returned <strong>Full</strong> at end (or vice versa).
            </div>
          ) : heatingType && heatingType.toLowerCase() === "oil" ? (
            <div className="mt-4 rounded-2xl bg-surface-muted/60 p-3 text-xs text-muted-foreground">
              Property uses oil heating. Recording the handover level avoids end-of-tenancy
              disputes.
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
    <div className="rounded-3xl border border-border bg-surface">
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
          <li key={it.id} className="grid gap-2 p-4 sm:grid-cols-[160px_180px_1fr_auto] sm:items-start">
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
}: {
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

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-3xl border border-border bg-surface p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-verified text-[var(--color-verified-foreground)]">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-base font-semibold tracking-tight">
              {isCustom ? "Custom tenancy agreement (uploaded)" : "Roost Standard NI Tenancy Agreement"}
            </p>
            <p className="text-xs text-muted-foreground">Fully executed · ready to download</p>
          </div>
        </div>
        <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
          <li>Tenant signature: <span className="text-foreground">{share.lease_signed_name || "—"}</span></li>
          <li>
            Signed by tenant:{" "}
            <span className="text-foreground">
              {share.lease_signed_at ? new Date(share.lease_signed_at).toLocaleString("en-GB") : "—"}
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
            <button
              type="button"
              onClick={openCustomLease}
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition hover:brightness-110"
            >
              <Download className="h-3.5 w-3.5" /> Open uploaded lease
            </button>
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
            <Download className="h-3.5 w-3.5" /> {isCustom ? "Signature record" : "Download / print"}
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-surface p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-surface-muted text-foreground">
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
      </div>
    </div>
  );
}
