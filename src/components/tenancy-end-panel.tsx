import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  ClipboardCheck,
  FileText,
  Loader2,
  Printer,
  Scale,
  Undo2,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { emitNotification } from "@/lib/notifications.functions";
import { Skeleton } from "@/components/ui/skeleton";
import { noticeToQuitHtml, depositSettlementHtml, openPrintable } from "@/lib/tenancy-docs";
import {
  DEPOSIT_RETURN_DAYS,
  END_STAGES,
  FINAL_CONDITIONS,
  NI_LEGAL_DISCLAIMER,
  daysUntil,
  deriveEndStage,
  deductionsTotal,
  depositDeadline,
  earliestEndDate,
  formatDate,
  noticeRule,
  parseDeductions,
  toISODate,
  type DeductionLine,
  type EndStageState,
  type NoticeParty,
} from "@/lib/tenancy-end";
import {
  FUEL_LEVELS,
  compareFuelLevels,
  fairFuelSentence,
  fuelLevelLabel,
  fuelTankLabel,
} from "@/lib/listing-details";

interface NoticeRow {
  id: string;
  share_id: string;
  served_by: string;
  served_by_role: string;
  served_on: string;
  notice_weeks: number;
  end_date: string;
  reason: string | null;
  acknowledged_at: string | null;
  withdrawn_at: string | null;
  created_at: string;
}

interface SettlementRow {
  id: string;
  share_id: string;
  deposit_total: number;
  deductions: unknown;
  proposed_return: number;
  proposed_at: string | null;
  tenant_response: string | null;
  tenant_responded_at: string | null;
  tenant_comment: string | null;
  scheme_dispute_ref: string | null;
  returned_at: string | null;
  return_method: string | null;
}

interface InventoryRow {
  id: string;
  room: string;
  condition: string | null;
  notes: string | null;
  final_condition: string | null;
  final_notes: string | null;
  sort_order: number;
  tenant_disputed?: boolean | null;
  tenant_comment?: string | null;
}

export interface TenancyEndPanelProps {
  shareId: string;
  role: NoticeParty;
  currentUserId: string | null;
  tenantId: string;
  landlordId: string;
  tenantName: string;
  landlordName: string;
  address: string;
  listingId: string;
  landlordRegNumber?: string | null;
  tenancyStart?: string | null;
  depositAmount: number;
  depositScheme?: string | null;
  oilClause?: boolean;
  /** Property heating type, used to name the fuel in copy. */
  heatingType?: string | null;
  /** Tank level recorded at handover — the Fair Fuel baseline. */
  handoverFuelLevel?: string | null;
  tenancyStatus?: string | null;
  finalMeterReadings?: string | null;
  finalOilLevel?: string | null;
  finalInspectionSubmittedAt?: string | null;
  finalInspectionResponse?: string | null;
  tenancyCompletedAt?: string | null;
  onChanged?: () => void;
}

const card = "rounded-sm border border-border bg-surface p-5";
const label = "text-xs font-medium uppercase tracking-wide text-muted-foreground";
const input =
  "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-verified";
const primaryBtn =
  "inline-flex items-center gap-2 rounded-xl bg-verified px-4 py-2 text-sm font-medium text-white disabled:opacity-60";
const ghostBtn =
  "inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-surface-muted disabled:opacity-60";

const money = (n: number) =>
  `£${Number(n || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function TenancyEndPanel(props: TenancyEndPanelProps) {
  const {
    shareId,
    role,
    tenantId,
    landlordId,
    tenantName,
    landlordName,
    address,
    listingId,
    landlordRegNumber,
    tenancyStart,
    depositAmount,
    depositScheme,
    oilClause,
    heatingType,
    handoverFuelLevel,
    finalMeterReadings,
    finalOilLevel,
    finalInspectionSubmittedAt,
    finalInspectionResponse,
    tenancyCompletedAt,
    onChanged,
  } = props;

  const qc = useQueryClient();
  const isLandlord = role === "landlord";
  const counterpartId = isLandlord ? tenantId : landlordId;

  const endQuery = useQuery({
    queryKey: ["tenancy-end", shareId],
    queryFn: async () => {
      const [notices, settlement, inventory] = await Promise.all([
        supabase
          .from("tenancy_notices")
          .select("*")
          .eq("share_id", shareId)
          .order("created_at", { ascending: false }),
        supabase
          .from("tenancy_deposit_settlements")
          .select("*")
          .eq("share_id", shareId)
          .maybeSingle(),
        supabase
          .from("tenancy_inventory_items")
          .select(
            "id, room, condition, notes, final_condition, final_notes, sort_order, tenant_disputed, tenant_comment",
          )
          .eq("share_id", shareId)
          .order("sort_order", { ascending: true }),
      ]);
      if (notices.error) throw notices.error;
      return {
        notices: (notices.data as unknown as NoticeRow[]) ?? [],
        settlement: (settlement.data as unknown as SettlementRow | null) ?? null,
        inventory: (inventory.data as unknown as InventoryRow[]) ?? [],
      };
    },
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["tenancy-end", shareId] });
    onChanged?.();
  };

  const notices = endQuery.data?.notices ?? [];
  const activeNotice = notices.find((n) => !n.withdrawn_at) ?? null;
  const settlement = endQuery.data?.settlement ?? null;
  const inventory = endQuery.data?.inventory ?? [];

  const stage = useMemo(
    () =>
      deriveEndStage({
        hasActiveNotice: !!activeNotice,
        noticeAcknowledged: !!activeNotice?.acknowledged_at,
        noticeEndDate: activeNotice?.end_date ?? null,
        inspectionSubmitted: !!finalInspectionSubmittedAt,
        inspectionResponse: finalInspectionResponse ?? null,
        settlementProposed: !!settlement?.proposed_at,
        settlementResponse: settlement?.tenant_response ?? null,
        depositReturned: !!settlement?.returned_at,
        completedAt: tenancyCompletedAt ?? null,
      }),
    [
      activeNotice,
      finalInspectionSubmittedAt,
      finalInspectionResponse,
      settlement,
      tenancyCompletedAt,
    ],
  );

  // Keep the shared tenancy status honest once the end date has passed.
  useEffect(() => {
    if (!activeNotice || !isLandlord) return;
    if (!stage.tenancyEnded || tenancyCompletedAt) return;
    if (props.tenancyStatus === "ended" || props.tenancyStatus === "completed") return;
    void supabase
      .from("passport_shares")
      .update({ tenancy_status: "ended" } as never)
      .eq("id", shareId)
      .then(() => onChanged?.());
  }, [activeNotice, stage.tenancyEnded, tenancyCompletedAt, props.tenancyStatus, shareId, isLandlord]);

  const notify = (
    type: Parameters<typeof emitNotification>[0] extends never ? never : string,
    title: string,
    body: string,
  ) =>
    emitNotification({
      data: {
        recipient_id: counterpartId,
        type: type as never,
        entity_type: "passport_share",
        entity_id: shareId,
        title,
        body,
        link_path: isLandlord
          ? "/tenant/tenancy"
          : `/landlord/manage-tenancy?share=${shareId}&tab=ending`,
      },
    }).catch((err) => console.error("[notify]", err));

  if (endQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-sm" />
        <Skeleton className="h-56 w-full rounded-sm" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <StageTracker stage={stage} role={role} endDate={activeNotice?.end_date ?? null} />

      <NoticeSection
        {...props}
        activeNotice={activeNotice}
        notices={notices}
        notify={notify}
        refresh={refresh}
      />

      {activeNotice && !activeNotice.withdrawn_at ? (
        <>
          <FinalInspectionSection
            shareId={shareId}
            isLandlord={isLandlord}
            inventory={inventory}
            oilClause={!!oilClause}
            heatingType={heatingType ?? null}
            handoverFuelLevel={handoverFuelLevel ?? null}
            finalMeterReadings={finalMeterReadings ?? null}
            finalOilLevel={finalOilLevel ?? null}
            submittedAt={finalInspectionSubmittedAt ?? null}
            response={finalInspectionResponse ?? null}
            notify={notify}
            refresh={refresh}
          />
          <SettlementSection
            shareId={shareId}
            isLandlord={isLandlord}
            settlement={settlement}
            depositAmount={depositAmount}
            depositScheme={depositScheme ?? null}
            endDate={activeNotice.end_date}
            landlordName={landlordName}
            tenantName={tenantName}
            address={address}
            notify={notify}
            refresh={refresh}
          />
          {isLandlord ? (
            <CompleteSection
              shareId={shareId}
              listingId={listingId}
              endDate={activeNotice.end_date}
              settlement={settlement}
              completedAt={tenancyCompletedAt ?? null}
              notify={notify}
              refresh={refresh}
            />
          ) : null}
        </>
      ) : null}

      <p className="px-1 text-xs text-muted-foreground">{NI_LEGAL_DISCLAIMER}</p>

      <div className={card}>
        <p className={label}>Notice history</p>
        {notices.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No notice has been served. The tenancy continues as normal.
          </p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {notices.map((n) => (
              <li key={n.id} className="flex flex-wrap items-center gap-2">
                <span className="font-medium">
                  {n.served_by_role === "landlord" ? "Landlord" : "Tenant"} notice
                </span>
                <span className="text-muted-foreground">
                  served {formatDate(n.served_on)} · {n.notice_weeks} weeks · ends{" "}
                  {formatDate(n.end_date)}
                </span>
                {n.withdrawn_at ? (
                  <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs">
                    Withdrawn
                  </span>
                ) : n.acknowledged_at ? (
                  <span className="rounded-full bg-verified-soft px-2 py-0.5 text-xs text-verified">
                    Acknowledged
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                    Awaiting acknowledgement
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Notice to Quit                                                      */
/* ------------------------------------------------------------------ */

type Notifier = (type: string, title: string, body: string) => void | Promise<unknown>;

/* ------------------------------------------------------------------ */
/* Stage tracker + shared bits                                         */
/* ------------------------------------------------------------------ */

function StageTracker({
  stage,
  role,
  endDate,
}: {
  stage: EndStageState;
  role: NoticeParty;
  endDate: string | null;
}) {
  const yourMove = stage.actor === role;
  const days = daysUntil(endDate);
  return (
    <div className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={label}>Where you are</p>
          <h3 className="mt-1 text-lg font-semibold">{stage.label}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{stage.nextAction}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            stage.disputed
              ? "bg-red-100 text-red-800"
              : yourMove
                ? "bg-amber-100 text-amber-800"
                : "bg-surface-muted text-muted-foreground"
          }`}
        >
          {stage.disputed
            ? "Dispute open"
            : stage.actor === "none"
              ? "Nothing to do"
              : yourMove
                ? "Your move"
                : `Waiting on the ${stage.actor}`}
        </span>
      </div>

      {stage.key !== "active" ? (
        <>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2">
            {END_STAGES.map((s) => {
              const done = stage.done.includes(s.key);
              const current = !done && stage.key === s.key;
              return (
                <li
                  key={s.key}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                    done
                      ? "border-verified/30 bg-verified-soft text-verified"
                      : current
                        ? "border-amber-300 bg-amber-50 text-amber-900"
                        : "border-border text-muted-foreground"
                  }`}
                >
                  {done ? (
                    <Check className="h-4 w-4 shrink-0" />
                  ) : (
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${current ? "bg-amber-500" : "bg-border"}`}
                    />
                  )}
                  {s.label}
                </li>
              );
            })}
          </ol>

          {stage.depositDeadline && stage.key !== "completed" ? (
            <p
              className={`mt-3 rounded-xl p-3 text-xs ${
                (stage.depositDaysLeft ?? 99) < 0
                  ? "bg-red-50 text-red-800"
                  : (stage.depositDaysLeft ?? 99) <= 7
                    ? "bg-amber-50 text-amber-900"
                    : "bg-surface-muted text-muted-foreground"
              }`}
            >
              <CalendarClock className="mr-1 inline h-3.5 w-3.5" />
              Deposit must be settled by {formatDate(stage.depositDeadline)}
              {stage.depositDaysLeft !== null
                ? stage.depositDaysLeft >= 0
                  ? ` — ${stage.depositDaysLeft} days left`
                  : ` — ${Math.abs(stage.depositDaysLeft)} days overdue`
                : ""}
              {days !== null && days > 0 ? ` · tenancy ends in ${days} days` : ""}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/** Two-step button for irreversible actions. */
function ConfirmButton({
  className,
  confirmLabel,
  children,
  onConfirm,
  disabled,
  hint,
}: {
  className: string;
  confirmLabel: string;
  children: React.ReactNode;
  onConfirm: () => void;
  disabled?: boolean;
  hint?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 6000);
    return () => clearTimeout(t);
  }, [armed]);
  if (!armed)
    return (
      <button type="button" className={className} disabled={disabled} onClick={() => setArmed(true)}>
        {children}
      </button>
    );
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        className={primaryBtn}
        disabled={disabled}
        onClick={() => {
          setArmed(false);
          onConfirm();
        }}
      >
        <AlertTriangle className="h-4 w-4" /> {confirmLabel}
      </button>
      <button type="button" className={ghostBtn} onClick={() => setArmed(false)}>
        Cancel
      </button>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </span>
  );
}

function NoticeSection(
  props: TenancyEndPanelProps & {
    activeNotice: NoticeRow | null;
    notices: NoticeRow[];
    notify: Notifier;
    refresh: () => void;
  },
) {
  const {
    shareId,
    role,
    currentUserId,
    tenantName,
    landlordName,
    address,
    landlordRegNumber,
    tenancyStart,
    activeNotice,
    notify,
    refresh,
  } = props;
  const isLandlord = role === "landlord";

  const today = toISODate(new Date());
  const [servedOn, setServedOn] = useState(today);
  const [reason, setReason] = useState("");
  const rule = useMemo(
    () => noticeRule(role, tenancyStart, servedOn),
    [role, tenancyStart, servedOn],
  );
  const minEnd = useMemo(
    () => earliestEndDate(role, tenancyStart, servedOn),
    [role, tenancyStart, servedOn],
  );
  const [endDate, setEndDate] = useState(minEnd);

  useEffect(() => {
    setEndDate((cur) => (cur < minEnd ? minEnd : cur));
  }, [minEnd]);

  const serve = useMutation({
    mutationFn: async () => {
      if (!currentUserId) throw new Error("You need to be signed in.");
      if (!tenancyStart)
        throw new Error(
          "Add the tenancy start date in the Overview tab first — the statutory notice period is worked out from it.",
        );
      if (endDate < minEnd)
        throw new Error("End date is shorter than the statutory notice period.");
      const { error } = await supabase.from("tenancy_notices").insert({
        share_id: shareId,
        served_by: currentUserId,
        served_by_role: role,
        served_on: servedOn,
        notice_weeks: rule.weeks,
        end_date: endDate,
        reason: reason.trim() || null,
      } as never);
      if (error) throw error;
      const { error: shareError } = await supabase
        .from("passport_shares")
        .update({ tenancy_status: "notice_served" } as never)
        .eq("id", shareId);
      if (shareError) throw shareError;
    },
    onSuccess: () => {
      toast.success("Notice to Quit recorded", {
        description: `Tenancy end date ${formatDate(endDate)}. Print and serve a written copy.`,
      });
      void notify(
        "notice_served",
        "Notice to Quit served",
        `${isLandlord ? landlordName : tenantName} served notice — tenancy ends ${formatDate(endDate)}.`,
      );
      refresh();
    },
    onError: (e: unknown) =>
      toast.error("Could not record the notice", {
        description: e instanceof Error ? e.message : "Please try again",
      }),
  });

  const acknowledge = useMutation({
    mutationFn: async () => {
      if (!activeNotice || !currentUserId) return;
      const { error } = await supabase
        .from("tenancy_notices")
        .update({
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: currentUserId,
        } as never)
        .eq("id", activeNotice.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notice acknowledged");
      void notify(
        "notice_acknowledged",
        "Notice acknowledged",
        `${address} — receipt of the Notice to Quit was acknowledged.`,
      );
      refresh();
    },
    onError: (e: unknown) =>
      toast.error("Could not acknowledge", {
        description: e instanceof Error ? e.message : "Please try again",
      }),
  });

  const withdraw = useMutation({
    mutationFn: async () => {
      if (!activeNotice) return;
      const { error } = await supabase
        .from("tenancy_notices")
        .update({ withdrawn_at: new Date().toISOString() } as never)
        .eq("id", activeNotice.id);
      if (error) throw error;
      await supabase
        .from("passport_shares")
        .update({ tenancy_status: "active" } as never)
        .eq("id", shareId);
    },
    onSuccess: () => {
      toast.success("Notice withdrawn — tenancy continues");
      refresh();
    },
    onError: (e: unknown) =>
      toast.error("Could not withdraw", {
        description: e instanceof Error ? e.message : "Please try again",
      }),
  });

  const print = (n: NoticeRow) => {
    const ok = openPrintable(
      noticeToQuitHtml({
        servedBy: n.served_by_role === "landlord" ? "landlord" : "tenant",
        landlordName,
        tenantName,
        address,
        landlordRegNumber: landlordRegNumber ?? null,
        tenancyStart: tenancyStart ?? null,
        servedOn: n.served_on,
        noticeWeeks: n.notice_weeks,
        endDate: n.end_date,
        reason: n.reason,
      }),
    );
    if (!ok) toast.error("Allow pop-ups to print the notice");
  };

  if (activeNotice) {
    const servedByMe = activeNotice.served_by_role === role;
    const remaining = daysUntil(activeNotice.end_date);
    return (
      <div className={card}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={label}>Notice to Quit</p>
            <h3 className="mt-1 text-lg font-semibold">
              Tenancy ends {formatDate(activeNotice.end_date)}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Served by the {activeNotice.served_by_role} on {formatDate(activeNotice.served_on)} ·{" "}
              {activeNotice.notice_weeks} weeks' notice
              {remaining !== null
                ? ` · ${remaining >= 0 ? `${remaining} days remaining` : `ended ${Math.abs(remaining)} days ago`}`
                : ""}
            </p>
            {activeNotice.reason ? (
              <p className="mt-2 text-sm">Reason given: {activeNotice.reason}</p>
            ) : null}
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
            <CalendarClock className="mr-1 inline h-3 w-3" />
            Ending
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={ghostBtn} onClick={() => print(activeNotice)}>
            <Printer className="h-4 w-4" /> Print written notice
          </button>
          {!servedByMe && !activeNotice.acknowledged_at ? (
            <button
              type="button"
              className={primaryBtn}
              disabled={acknowledge.isPending}
              onClick={() => acknowledge.mutate()}
            >
              {acknowledge.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Acknowledge receipt
            </button>
          ) : null}
          {servedByMe ? (
            <ConfirmButton
              className={ghostBtn}
              confirmLabel="Yes, withdraw the notice"
              disabled={withdraw.isPending}
              onConfirm={() => withdraw.mutate()}
              hint={
                activeNotice.acknowledged_at
                  ? "The other party has already acknowledged this notice."
                  : "The tenancy will continue as normal."
              }
            >
              <Undo2 className="h-4 w-4" /> Withdraw notice
            </ConfirmButton>
          ) : null}
        </div>

        <p className="mt-4 rounded-xl bg-surface-muted p-3 text-xs text-muted-foreground">
          A Notice to Quit must be in writing. Print the notice above and deliver it to the other
          party — RoostNI keeps the dated record. Deposits must be settled within{" "}
          {DEPOSIT_RETURN_DAYS} days of the end date (by{" "}
          {formatDate(depositDeadline(activeNotice.end_date))}).
        </p>
      </div>
    );
  }

  return (
    <div className={card}>
      <p className={label}>Ending the tenancy</p>
      <h3 className="mt-1 text-lg font-semibold">Serve a Notice to Quit</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        RoostNI works out the statutory minimum notice under the Private Tenancies Act (Northern
        Ireland) 2022 from the tenancy start date.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <span className={label}>Date notice is served</span>
          <input
            type="date"
            className={input}
            value={servedOn}
            onChange={(e) => setServedOn(e.target.value)}
          />
        </div>
        <div>
          <span className={label}>Tenancy end date</span>
          <input
            type="date"
            className={input}
            min={minEnd}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Earliest permitted: {formatDate(minEnd)}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-verified/30 bg-verified-soft p-3 text-sm">
        <p className="font-medium text-verified">
          <Scale className="mr-1 inline h-4 w-4" />
          {rule.weeks} weeks' minimum notice
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{rule.basis}</p>
      </div>

      <div className="mt-4">
        <span className={label}>Reason (optional)</span>
        <textarea
          className={`${input} min-h-20`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={isLandlord ? "e.g. Property to be sold" : "e.g. Relocating for work"}
        />
      </div>

      <button
        type="button"
        className={`${primaryBtn} mt-4`}
        disabled={serve.isPending || !tenancyStart}
        onClick={() => serve.mutate()}
      >
        {serve.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        Record &amp; generate Notice to Quit
      </button>
      {!tenancyStart ? (
        <p className="mt-2 text-xs text-amber-700">
          <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
          Set the tenancy start date in the Overview tab before serving notice — RoostNI needs it to
          work out the statutory period.
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Final inspection                                                    */
/* ------------------------------------------------------------------ */

function FinalInspectionSection({
  shareId,
  isLandlord,
  inventory,
  oilClause,
  heatingType,
  handoverFuelLevel,
  finalMeterReadings,
  finalOilLevel,
  submittedAt,
  response,
  notify,
  refresh,
}: {
  shareId: string;
  isLandlord: boolean;
  inventory: InventoryRow[];
  oilClause: boolean;
  heatingType: string | null;
  handoverFuelLevel: string | null;
  finalMeterReadings: string | null;
  finalOilLevel: string | null;
  submittedAt: string | null;
  response: string | null;
  notify: Notifier;
  refresh: () => void;
}) {
  const [rows, setRows] = useState<Record<string, { condition: string; notes: string }>>({});
  const [meters, setMeters] = useState(finalMeterReadings ?? "");
  const [oil, setOil] = useState(finalOilLevel ?? "");
  const [tenantRows, setTenantRows] = useState<
    Record<string, { disputed: boolean; comment: string }>
  >({});

  useEffect(() => {
    setRows(
      Object.fromEntries(
        inventory.map((i) => [
          i.id,
          { condition: i.final_condition ?? "", notes: i.final_notes ?? "" },
        ]),
      ),
    );
    setTenantRows(
      Object.fromEntries(
        inventory.map((i) => [
          i.id,
          { disputed: !!i.tenant_disputed, comment: i.tenant_comment ?? "" },
        ]),
      ),
    );
  }, [inventory]);

  const submit = useMutation({
    mutationFn: async () => {
      await Promise.all(
        inventory.map((i) =>
          supabase
            .from("tenancy_inventory_items")
            .update({
              final_condition: rows[i.id]?.condition || null,
              final_notes: rows[i.id]?.notes || null,
            } as never)
            .eq("id", i.id),
        ),
      );
      const { error } = await supabase
        .from("passport_shares")
        .update({
          final_meter_readings: meters.trim() || null,
          final_oil_level: oil || null,
          final_inspection_submitted_at: new Date().toISOString(),
          final_inspection_response: null,
          final_inspection_responded_at: null,
        } as never)
        .eq("id", shareId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Final inspection sent to the tenant");
      void notify(
        "final_inspection_submitted",
        "Final inspection ready to review",
        "Your landlord has completed the move-out inspection. Review and agree or dispute it.",
      );
      refresh();
    },
    onError: (e: unknown) =>
      toast.error("Could not save the inspection", {
        description: e instanceof Error ? e.message : "Please try again",
      }),
  });

  const respond = useMutation({
    mutationFn: async (value: "agreed" | "disputed") => {
      await Promise.all(
        inventory.map((i) =>
          supabase
            .from("tenancy_inventory_items")
            .update({
              tenant_disputed: !!tenantRows[i.id]?.disputed,
              tenant_comment: tenantRows[i.id]?.comment?.trim() || null,
            } as never)
            .eq("id", i.id),
        ),
      );
      const { error } = await supabase
        .from("passport_shares")
        .update({
          final_inspection_response: value,
          final_inspection_responded_at: new Date().toISOString(),
        } as never)
        .eq("id", shareId);
      if (error) throw error;
      return value;
    },
    onSuccess: (value) => {
      toast.success(value === "agreed" ? "Inspection agreed" : "Inspection disputed");
      void notify(
        value === "agreed" ? "final_inspection_agreed" : "final_inspection_disputed",
        value === "agreed"
          ? "Tenant agreed the final inspection"
          : "Tenant disputed the final inspection",
        "Move-out condition report response recorded in RoostNI.",
      );
      refresh();
    },
    onError: (e: unknown) =>
      toast.error("Could not record your response", {
        description: e instanceof Error ? e.message : "Please try again",
      }),
  });

  return (
    <div className={card}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className={label}>Final inspection</p>
          <h3 className="mt-1 text-lg font-semibold">Move-out condition report</h3>
        </div>
        {submittedAt ? (
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              response === "agreed"
                ? "bg-verified-soft text-verified"
                : response === "disputed"
                  ? "bg-red-100 text-red-800"
                  : "bg-amber-100 text-amber-800"
            }`}
          >
            {response === "agreed"
              ? "Agreed by tenant"
              : response === "disputed"
                ? "Disputed by tenant"
                : "Awaiting tenant review"}
          </span>
        ) : null}
      </div>

      {inventory.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No move-in inventory was recorded, so there is nothing to compare against. Add inventory
          rooms in the Inventory tab first.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {inventory.map((item) => (
            <div key={item.id} className="rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{item.room}</p>
                <p className="text-xs text-muted-foreground">
                  Move-in: {item.condition || "Not recorded"}
                </p>
              </div>
              {isLandlord ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-[200px_1fr]">
                  <select
                    className={input}
                    value={rows[item.id]?.condition ?? ""}
                    onChange={(e) =>
                      setRows((r) => ({
                        ...r,
                        [item.id]: { condition: e.target.value, notes: r[item.id]?.notes ?? "" },
                      }))
                    }
                  >
                    <option value="">Move-out condition…</option>
                    {FINAL_CONDITIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <input
                    className={input}
                    placeholder="Notes (optional)"
                    value={rows[item.id]?.notes ?? ""}
                    onChange={(e) =>
                      setRows((r) => ({
                        ...r,
                        [item.id]: {
                          condition: r[item.id]?.condition ?? "",
                          notes: e.target.value,
                        },
                      }))
                    }
                  />
                </div>
              ) : (
                <>
                  <p className="mt-1 text-sm">
                    Move-out:{" "}
                    <span className="font-medium">
                      {item.final_condition || "Not yet inspected"}
                    </span>
                    {item.final_notes ? ` — ${item.final_notes}` : ""}
                  </p>
                  {submittedAt && !response ? (
                    <div className="mt-2 space-y-2">
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={!!tenantRows[item.id]?.disputed}
                          onChange={(e) =>
                            setTenantRows((r) => ({
                              ...r,
                              [item.id]: {
                                disputed: e.target.checked,
                                comment: r[item.id]?.comment ?? "",
                              },
                            }))
                          }
                        />
                        I disagree with this room
                      </label>
                      {tenantRows[item.id]?.disputed ? (
                        <input
                          className={input}
                          placeholder="Why do you disagree?"
                          value={tenantRows[item.id]?.comment ?? ""}
                          onChange={(e) =>
                            setTenantRows((r) => ({
                              ...r,
                              [item.id]: { disputed: true, comment: e.target.value },
                            }))
                          }
                        />
                      ) : null}
                    </div>
                  ) : item.tenant_disputed ? (
                    <p className="mt-1 text-xs text-red-700">
                      Tenant disagreed{item.tenant_comment ? `: ${item.tenant_comment}` : ""}
                    </p>
                  ) : null}
                </>
              )}
              {isLandlord && item.tenant_disputed ? (
                <p className="mt-2 text-xs text-red-700">
                  <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
                  Tenant disagreed{item.tenant_comment ? `: ${item.tenant_comment}` : ""}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <span className={label}>Final meter readings</span>
          {isLandlord ? (
            <input
              className={input}
              value={meters}
              onChange={(e) => setMeters(e.target.value)}
              placeholder="Electric 12345 · Gas 6789"
            />
          ) : (
            <p className="mt-1 text-sm">{finalMeterReadings || "Not recorded"}</p>
          )}
        </div>
        {oilClause ? (
          <div>
            <span className={label}>{fuelTankLabel(heatingType)} level at move-out</span>
            <p className="mt-1 text-xs text-muted-foreground">
              Recorded at handover:{" "}
              <strong>{fuelLevelLabel(handoverFuelLevel) ?? "not recorded"}</strong>
            </p>
            {isLandlord ? (
              <select className={input} value={oil} onChange={(e) => setOil(e.target.value)}>
                <option value="">Select level…</option>
                {FUEL_LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            ) : (
              <p className="mt-1 text-sm">{fuelLevelLabel(finalOilLevel) ?? "Not recorded"}</p>
            )}
            {(() => {
              const cmp = compareFuelLevels(handoverFuelLevel, isLandlord ? oil : finalOilLevel);
              return (
                <p
                  className={`mt-1 text-xs ${
                    cmp.status === "below"
                      ? "text-amber-700"
                      : cmp.status === "met"
                        ? "text-verified"
                        : "text-muted-foreground"
                  }`}
                >
                  {cmp.message}
                </p>
              );
            })()}
            <p className="mt-1 text-xs text-muted-foreground">{fairFuelSentence(heatingType)}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {isLandlord ? (
          <button
            type="button"
            className={primaryBtn}
            disabled={submit.isPending || inventory.length === 0}
            onClick={() => submit.mutate()}
          >
            {submit.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ClipboardCheck className="h-4 w-4" />
            )}
            {submittedAt ? "Resend inspection to tenant" : "Send inspection to tenant"}
          </button>
        ) : submittedAt && !response ? (
          <>
            <button
              type="button"
              className={primaryBtn}
              disabled={respond.isPending}
              onClick={() => respond.mutate("agreed")}
            >
              <Check className="h-4 w-4" /> Agree with the report
            </button>
            <button
              type="button"
              className={ghostBtn}
              disabled={respond.isPending}
              onClick={() => respond.mutate("disputed")}
            >
              <X className="h-4 w-4" /> Dispute the report
            </button>
          </>
        ) : !submittedAt ? (
          <p className="text-sm text-muted-foreground">
            Your landlord has not completed the move-out inspection yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Deposit settlement                                                  */
/* ------------------------------------------------------------------ */

function SettlementSection({
  shareId,
  isLandlord,
  settlement,
  depositAmount,
  depositScheme,
  endDate,
  landlordName,
  tenantName,
  address,
  notify,
  refresh,
}: {
  shareId: string;
  isLandlord: boolean;
  settlement: SettlementRow | null;
  depositAmount: number;
  depositScheme: string | null;
  endDate: string;
  landlordName: string;
  tenantName: string;
  address: string;
  notify: Notifier;
  refresh: () => void;
}) {
  const existing = parseDeductions(settlement?.deductions);
  const [lines, setLines] = useState<DeductionLine[]>(
    existing.length ? existing : [{ reason: "", amount: 0 }],
  );
  const [comment, setComment] = useState("");
  const [disputeRef, setDisputeRef] = useState(settlement?.scheme_dispute_ref ?? "");
  const [returnMethod, setReturnMethod] = useState(settlement?.return_method ?? "Bank transfer");

  useEffect(() => {
    const next = parseDeductions(settlement?.deductions);
    if (next.length) setLines(next);
  }, [settlement?.deductions]);

  const total = deductionsTotal(lines);
  const proposedReturn = Math.max(0, Number(depositAmount || 0) - total);
  const deadline = depositDeadline(endDate);
  const daysLeft = daysUntil(deadline);

  const propose = useMutation({
    mutationFn: async () => {
      const clean = lines.filter((l) => l.reason.trim() || l.amount);
      if (clean.some((l) => !l.reason.trim()))
        throw new Error("Give a reason for every deduction.");
      if (clean.some((l) => l.amount < 0)) throw new Error("Deductions cannot be negative.");
      if (total > Number(depositAmount || 0))
        throw new Error("Deductions cannot be more than the deposit held.");
      const payload = {
        share_id: shareId,
        deposit_total: Number(depositAmount || 0),
        deductions: clean,
        proposed_return: proposedReturn,
        proposed_at: new Date().toISOString(),
        tenant_response: null,
        tenant_responded_at: null,
      };
      const { error } = await supabase
        .from("tenancy_deposit_settlements")
        .upsert(payload as never, { onConflict: "share_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Settlement proposed", {
        description: `Returning ${money(proposedReturn)} to the tenant.`,
      });
      void notify(
        "deposit_settlement_proposed",
        "Deposit settlement proposed",
        `Your landlord proposes returning ${money(proposedReturn)} of your deposit.`,
      );
      refresh();
    },
    onError: (e: unknown) =>
      toast.error("Could not save the settlement", {
        description: e instanceof Error ? e.message : "Please try again",
      }),
  });

  const respond = useMutation({
    mutationFn: async (value: "agreed" | "disputed") => {
      const { error } = await supabase
        .from("tenancy_deposit_settlements")
        .update({
          tenant_response: value,
          tenant_responded_at: new Date().toISOString(),
          tenant_comment: comment.trim() || null,
        } as never)
        .eq("share_id", shareId);
      if (error) throw error;
      return value;
    },
    onSuccess: (value) => {
      toast.success(value === "agreed" ? "Settlement agreed" : "Settlement disputed");
      void notify(
        value === "agreed" ? "deposit_returned" : "final_inspection_disputed",
        value === "agreed"
          ? "Tenant agreed the deposit settlement"
          : "Tenant disputed the deposit settlement",
        value === "agreed"
          ? "You can now return the deposit and complete the tenancy."
          : "Raise the dispute with the scheme holding the deposit.",
      );
      refresh();
    },
    onError: (e: unknown) =>
      toast.error("Could not record your response", {
        description: e instanceof Error ? e.message : "Please try again",
      }),
  });

  const markReturned = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tenancy_deposit_settlements")
        .update({
          returned_at: new Date().toISOString(),
          return_method: returnMethod,
          scheme_dispute_ref: disputeRef.trim() || null,
        } as never)
        .eq("share_id", shareId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deposit marked as returned");
      void notify(
        "deposit_returned",
        "Deposit returned",
        `${address} — your landlord has recorded the deposit return.`,
      );
      refresh();
    },
    onError: (e: unknown) =>
      toast.error("Could not update", {
        description: e instanceof Error ? e.message : "Please try again",
      }),
  });

  const printStatement = () => {
    const ok = openPrintable(
      depositSettlementHtml({
        landlordName,
        tenantName,
        address,
        depositTotal: Number(settlement?.deposit_total ?? depositAmount),
        deductions: parseDeductions(settlement?.deductions ?? lines),
        proposedReturn: Number(settlement?.proposed_return ?? proposedReturn),
        tenantResponse: settlement?.tenant_response ?? null,
        tenantComment: settlement?.tenant_comment ?? null,
        schemeDisputeRef: settlement?.scheme_dispute_ref ?? null,
        depositScheme,
        endDate,
        returnedAt: settlement?.returned_at ?? null,
        returnMethod: settlement?.return_method ?? null,
      }),
    );
    if (!ok) toast.error("Allow pop-ups to print the statement");
  };

  return (
    <div className={card}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className={label}>Deposit settlement</p>
          <h3 className="mt-1 text-lg font-semibold">{money(depositAmount)} held</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Must be settled by {formatDate(deadline)}
            {daysLeft !== null
              ? ` · ${daysLeft >= 0 ? `${daysLeft} days left` : `${Math.abs(daysLeft)} days overdue`}`
              : ""}
            {depositScheme ? ` · Scheme: ${depositScheme}` : ""}
          </p>
        </div>
        {settlement?.returned_at ? (
          <span className="rounded-full bg-verified-soft px-3 py-1 text-xs font-medium text-verified">
            Returned
          </span>
        ) : settlement?.tenant_response ? (
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              settlement.tenant_response === "agreed"
                ? "bg-verified-soft text-verified"
                : "bg-red-100 text-red-800"
            }`}
          >
            {settlement.tenant_response === "agreed" ? "Agreed" : "Disputed"}
          </span>
        ) : settlement?.proposed_at ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
            Awaiting tenant
          </span>
        ) : null}
      </div>

      {isLandlord ? (
        <div className="mt-4 space-y-2">
          {lines.map((line, idx) => (
            <div key={idx} className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
              <input
                className={input}
                placeholder="Deduction reason (e.g. carpet cleaning)"
                value={line.reason}
                onChange={(e) =>
                  setLines((ls) =>
                    ls.map((l, i) => (i === idx ? { ...l, reason: e.target.value } : l)),
                  )
                }
              />
              <input
                className={input}
                type="number"
                min={0}
                step="0.01"
                value={line.amount || ""}
                onChange={(e) =>
                  setLines((ls) =>
                    ls.map((l, i) =>
                      i === idx ? { ...l, amount: Number(e.target.value) || 0 } : l,
                    ),
                  )
                }
              />
              <button
                type="button"
                className="mt-1 rounded-xl border border-border px-3 text-sm text-muted-foreground"
                onClick={() =>
                  setLines((ls) =>
                    ls.length === 1 ? [{ reason: "", amount: 0 }] : ls.filter((_, i) => i !== idx),
                  )
                }
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-sm font-medium text-verified"
            onClick={() => setLines((ls) => [...ls, { reason: "", amount: 0 }])}
          >
            + Add deduction
          </button>

          <div className="mt-3 rounded-xl bg-surface-muted p-3 text-sm">
            <div className="flex justify-between">
              <span>Deductions</span>
              <span>{money(total)}</span>
            </div>
            <div className="mt-1 flex justify-between font-semibold">
              <span>Returning to tenant</span>
              <span>{money(proposedReturn)}</span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={primaryBtn}
              disabled={propose.isPending}
              onClick={() => propose.mutate()}
            >
              {propose.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Scale className="h-4 w-4" />
              )}
              {settlement?.proposed_at ? "Update proposal" : "Propose settlement"}
            </button>
            <button type="button" className={ghostBtn} onClick={printStatement}>
              <Printer className="h-4 w-4" /> Print statement
            </button>
          </div>

          {settlement?.tenant_response === "disputed" ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm">
              <p className="font-medium text-red-800">
                <AlertTriangle className="mr-1 inline h-4 w-4" /> Tenant disputed this settlement
              </p>
              {settlement.tenant_comment ? (
                <p className="mt-1">{settlement.tenant_comment}</p>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground">
                Refer the dispute to the scheme protecting the deposit — their resolution service is
                free to use.
              </p>
              <input
                className={input}
                placeholder="Scheme dispute reference"
                value={disputeRef}
                onChange={(e) => setDisputeRef(e.target.value)}
              />
            </div>
          ) : null}

          {settlement?.proposed_at && !settlement?.returned_at ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
              <select
                className={input}
                value={returnMethod}
                onChange={(e) => setReturnMethod(e.target.value)}
              >
                {["Bank transfer", "Cash", "Cheque", "Via scheme"].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <ConfirmButton
                className={primaryBtn}
                confirmLabel="Yes, deposit returned"
                disabled={markReturned.isPending}
                onConfirm={() => markReturned.mutate()}
                hint="This is recorded on the statutory record and cannot be undone."
              >
                <Check className="h-4 w-4" /> Mark deposit returned
              </ConfirmButton>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {!settlement?.proposed_at ? (
            <p className="text-sm text-muted-foreground">
              Your landlord has not proposed a deposit settlement yet. They have until{" "}
              {formatDate(deadline)}.
            </p>
          ) : (
            <>
              <div className="rounded-xl bg-surface-muted p-3 text-sm">
                {parseDeductions(settlement.deductions).length === 0 ? (
                  <p>No deductions proposed.</p>
                ) : (
                  parseDeductions(settlement.deductions).map((d, i) => (
                    <div key={i} className="flex justify-between">
                      <span>{d.reason}</span>
                      <span>{money(d.amount)}</span>
                    </div>
                  ))
                )}
                <div className="mt-2 flex justify-between font-semibold">
                  <span>Returning to you</span>
                  <span>{money(Number(settlement.proposed_return))}</span>
                </div>
              </div>

              {settlement.tenant_response ? (
                <p className="text-sm">
                  You {settlement.tenant_response === "agreed" ? "agreed" : "disputed"} this
                  settlement on {formatDate(settlement.tenant_responded_at)}.
                  {settlement.returned_at
                    ? ` Deposit returned ${formatDate(settlement.returned_at)}${settlement.return_method ? ` by ${settlement.return_method}` : ""}.`
                    : ""}
                </p>
              ) : (
                <>
                  <textarea
                    className={`${input} min-h-20`}
                    placeholder="Add a comment (required if you disagree)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={primaryBtn}
                      disabled={respond.isPending}
                      onClick={() => respond.mutate("agreed")}
                    >
                      <Check className="h-4 w-4" /> Agree settlement
                    </button>
                    <button
                      type="button"
                      className={ghostBtn}
                      disabled={respond.isPending || !comment.trim()}
                      onClick={() => respond.mutate("disputed")}
                    >
                      <X className="h-4 w-4" /> Dispute settlement
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    If you dispute, the scheme protecting your deposit provides free dispute
                    resolution.
                  </p>
                </>
              )}
              <button type="button" className={ghostBtn} onClick={printStatement}>
                <Printer className="h-4 w-4" /> Print statement
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Complete tenancy (landlord)                                         */
/* ------------------------------------------------------------------ */

function CompleteSection({
  shareId,
  listingId,
  endDate,
  settlement,
  completedAt,
  notify,
  refresh,
}: {
  shareId: string;
  listingId: string;
  endDate: string;
  settlement: SettlementRow | null;
  completedAt: string | null;
  notify: Notifier;
  refresh: () => void;
}) {
  const [relist, setRelist] = useState(true);
  const ended = (daysUntil(endDate) ?? 1) <= 0;
  const depositSettled = !!settlement?.returned_at;
  const disputeOpen = settlement?.tenant_response === "disputed" && !settlement?.returned_at;
  const blockedReason = !ended
    ? "Available once the tenancy end date has passed."
    : disputeOpen
      ? "Resolve the deposit dispute with the scheme and record the outcome before closing."
      : !depositSettled
        ? "Record the deposit return before closing the tenancy."
        : null;

  const complete = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("passport_shares")
        .update({
          tenancy_status: "completed",
          tenancy_completed_at: new Date().toISOString(),
        } as never)
        .eq("id", shareId);
      if (error) throw error;
      const { error: listErr } = await supabase
        .from("property_listings")
        .update({
          occupancy_status: "vacant",
          is_published: false,
          tenancy_ended_at: new Date().toISOString(),
          ...(relist ? { status: "available" } : {}),
        } as never)
        .eq("id", listingId);
      if (listErr) throw listErr;
    },
    onSuccess: () => {
      toast.success("Tenancy completed", {
        description: relist
          ? "The property is now marked vacant. Advertise it on RoostNI whenever you're ready."
          : "The property is now marked vacant and stays off the public listings.",
      });
      void notify(
        "tenancy_completed",
        "Tenancy completed",
        "Your tenancy has been closed off in RoostNI.",
      );
      refresh();
    },
    onError: (e: unknown) =>
      toast.error("Could not complete the tenancy", {
        description: e instanceof Error ? e.message : "Please try again",
      }),
  });

  if (completedAt) {
    return (
      <div className={card}>
        <p className={label}>Tenancy closed</p>
        <h3 className="mt-1 text-lg font-semibold">Completed {formatDate(completedAt)}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          All records remain available in the Documents tab for your files.
        </p>
      </div>
    );
  }

  return (
    <div className={card}>
      <p className={label}>Close the tenancy</p>
      <h3 className="mt-1 text-lg font-semibold">Final step</h3>
      <ul className="mt-3 space-y-1 text-sm">
        <li className={ended ? "text-verified" : "text-muted-foreground"}>
          {ended ? "✓" : "•"} Tenancy end date reached ({formatDate(endDate)})
        </li>
        <li className={depositSettled ? "text-verified" : "text-muted-foreground"}>
          {depositSettled ? "✓" : "•"} Deposit returned or deductions agreed
        </li>
        <li className={!disputeOpen ? "text-verified" : "text-muted-foreground"}>
          {!disputeOpen ? "✓" : "•"} No open deposit dispute
        </li>
      </ul>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={relist} onChange={(e) => setRelist(e.target.checked)} />
        Return the property to available for new applications
      </label>
      <div className="mt-4">
        <ConfirmButton
          className={primaryBtn}
          confirmLabel="Yes, close this tenancy"
          disabled={complete.isPending || !!blockedReason}
          onConfirm={() => complete.mutate()}
          hint={relist ? "The property returns to available." : undefined}
        >
          {complete.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Complete tenancy
        </ConfirmButton>
      </div>
      {blockedReason ? (
        <p className="mt-2 text-xs text-amber-700">
          <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
          {blockedReason}
        </p>
      ) : null}
    </div>
  );
}
