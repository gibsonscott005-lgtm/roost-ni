import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  Camera,
  Check,
  ClipboardList,
  Loader2,
  Wrench,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { readSafeImage } from "@/lib/safe-image";
import { emitNotification } from "@/lib/notifications.functions";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";

type Urgency = "low" | "medium" | "high" | "emergency";
type Status = "reported" | "in_progress" | "resolved" | "cancelled";

interface Ticket {
  id: string;
  property_id: string;
  tenant_id: string;
  title: string;
  description: string;
  urgency: Urgency;
  status: Status;
  photo_urls: string[];
  landlord_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at?: string | null;
}

const BUCKET = "tenant-documents";
const MAX_BYTES = 8 * 1024 * 1024;

const URGENCY_LABEL: Record<Urgency, string> = {
  low: "Low — cosmetic",
  medium: "Medium — standard repair",
  high: "High — heating loss, heavy leak",
  emergency: "Emergency — risk to safety",
};

const STATUS_LABEL: Record<Status, string> = {
  reported: "Reported",
  in_progress: "In progress",
  resolved: "Resolved",
  cancelled: "Cancelled",
};

function statusPill(status: Status) {
  const cls =
    status === "resolved"
      ? "bg-verified-soft text-verified"
      : status === "in_progress"
        ? "bg-sky-100 text-sky-800"
        : status === "cancelled"
          ? "bg-surface-muted text-muted-foreground"
          : "bg-amber-100 text-amber-800";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cls}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

const URGENCY_TAG: Record<Urgency, string> = {
  emergency: "Emergency",
  high: "Urgent",
  medium: "Standard",
  low: "Cosmetic",
};

const URGENCY_RANK: Record<Urgency, number> = { emergency: 0, high: 1, medium: 2, low: 3 };

/** Open tickets first, most urgent first, then newest. */
function sortTickets(list: Ticket[]) {
  const closed = (s: Status) => s === "resolved" || s === "cancelled";
  return [...list].sort(
    (a, b) =>
      Number(closed(a.status)) - Number(closed(b.status)) ||
      URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] ||
      b.created_at.localeCompare(a.created_at),
  );
}

function fmtStamp(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function urgencyPill(urgency: Urgency) {
  const cls =
    urgency === "emergency"
      ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
      : urgency === "high"
        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        : "bg-surface-muted text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cls}`}
    >
      {URGENCY_TAG[urgency]}
    </span>
  );
}

function SignedPhoto({ path }: { path: string }) {
  const { data, isError, refetch, isFetching } = useQuery({
    queryKey: ["maintenance-photo", path],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 60 * 10);
      if (error) throw error;
      return data.signedUrl;
    },
    staleTime: 60 * 1000 * 8,
    retry: 1,
  });
  if (isError) {
    return (
      <button
        type="button"
        onClick={() => refetch()}
        title="Signed link expired — click to refresh"
        className="inline-flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-border bg-surface-muted text-[9px] font-medium text-muted-foreground transition hover:bg-secondary"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
        Refresh link
      </button>
    );
  }
  if (!data) {
    return (
      <Skeleton className="h-14 w-14 rounded-lg" />
    );
  }
  return (
    <a href={data} target="_blank" rel="noreferrer noopener" download className="block">
      <img
        src={data}
        alt="Maintenance photo"
        className="h-14 w-14 rounded-lg border border-border object-cover transition hover:opacity-80"
        onError={() => refetch()}
      />
    </a>
  );
}

function Photos({ paths }: { paths: string[] }) {
  if (!paths?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {paths.map((p) => (
        <SignedPhoto key={p} path={p} />
      ))}
    </div>
  );
}

function TicketSkeletonList({ compact = false }: { compact?: boolean }) {
  const rows = compact ? 2 : 3;
  return (
    <ul className="space-y-3" aria-busy="true" aria-label="Loading tickets">
      {Array.from({ length: rows }).map((_, i) => (
        <li
          key={i}
          className={`space-y-3 rounded-2xl border border-border bg-surface ${compact ? "p-4" : "p-5"}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex shrink-0 gap-1.5">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </li>
      ))}
    </ul>
  );
}

function useTickets(propertyId: string | undefined, queryKey: string) {
  return useQuery({
    enabled: !!propertyId,
    queryKey: [queryKey, propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_tickets")
        .select(
          "id, property_id, tenant_id, title, description, urgency, status, photo_urls, landlord_notes, resolved_at, created_at, updated_at",
        )
        .eq("property_id", propertyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as Ticket[]) ?? [];
    },
  });
}

// ---------------------------------------------------------------------------
// Tenant view
// ---------------------------------------------------------------------------

export function TenantMaintenanceTab({
  propertyId,
  landlordId,
  tenantId,
  tenantName,
  address,
  shareId,
}: {
  propertyId: string;
  landlordId: string;
  tenantId: string;
  tenantName: string;
  address: string;
  shareId?: string;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("medium");
  const [paths, setPaths] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: tickets = [], isLoading } = useTickets(propertyId, "maintenance-tickets");

  const uploadPhoto = async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error("Photo too large", { description: "Maximum 8 MB per photo." });
      return;
    }
    setUploading(true);
    try {
      const image = await readSafeImage(file);
      const path = `${tenantId}/maintenance/${crypto.randomUUID()}.${image.extension}`;
      const { error } = await supabase.storage.from(BUCKET).upload(
        path,
        new Blob([image.bytes], { type: image.contentType }),
        { cacheControl: "3600", upsert: false, contentType: image.contentType },
      );
      if (error) throw error;
      setPaths((p) => [...p, path]);
    } catch (err: unknown) {
      toast.error("Upload failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  const submit = useMutation({
    mutationFn: async () => {
      const { data: ticket, error } = await supabase
        .from("maintenance_tickets")
        .insert({
          property_id: propertyId,
          tenant_id: tenantId,
          title: title.trim(),
          description: description.trim(),
          urgency,
          photo_urls: paths,
        } as never)
        .select("id")
        .single();
      if (error) throw error;
      await emitNotification({
        data: {
          recipient_id: landlordId,
          type: "maintenance_reported",
          entity_type: "maintenance_ticket",
          entity_id: (ticket as { id: string }).id,
          title: `Maintenance reported — ${urgency}`,
          body: `${tenantName} logged an issue at ${address}: "${title.trim()}"`,
          link_path: shareId
            ? `/landlord/manage-tenancy?share=${shareId}&tab=maintenance`
            : `/dashboard`,
        },
      }).catch((err) => console.error("[notify]", err));
    },
    onSuccess: () => {
      toast.success("Maintenance ticket submitted", {
        description: "Your landlord has been notified.",
      });
      setTitle("");
      setDescription("");
      setUrgency("medium");
      setPaths([]);
      qc.invalidateQueries({ queryKey: ["maintenance-tickets", propertyId] });
    },
    onError: (e: unknown) =>
      toast.error("Could not submit", {
        description: e instanceof Error ? e.message : "Please try again.",
      }),
  });

  const canSubmit = title.trim().length > 2 && description.trim().length > 5;

  return (
    <div className="grid gap-5 md:grid-cols-5">
      {/* Form */}
      <div className="md:col-span-2">
        <div className="rounded-3xl border border-border bg-surface p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Wrench className="h-4 w-4 text-verified" /> Report an issue
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Log a repair or maintenance concern. Your landlord is notified instantly.
          </p>

          <div className="mt-4 space-y-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Brief title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Leaking kitchen sink pipe"
                className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-verified"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Urgency
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as Urgency)}
                className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-verified"
              >
                {(Object.keys(URGENCY_LABEL) as Urgency[]).map((u) => (
                  <option key={u} value={u}>
                    {URGENCY_LABEL[u]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Full description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Add detail so your landlord can organise the right trade person."
                className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-verified"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Photos (optional)
              </label>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition hover:bg-secondary">
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                  Add photo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadPhoto(f);
                      e.target.value = "";
                    }}
                  />
                </label>
                {paths.map((p) => (
                  <div key={p} className="relative">
                    <SignedPhoto path={p} />
                    <button
                      type="button"
                      onClick={() => setPaths((cur) => cur.filter((x) => x !== p))}
                      className="absolute -right-1.5 -top-1.5 rounded-full bg-foreground p-0.5 text-background shadow"
                      aria-label="Remove photo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => submit.mutate()}
              disabled={!canSubmit || submit.isPending}
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-foreground px-4 py-2.5 text-xs font-semibold text-background shadow-sm transition hover:brightness-110 disabled:opacity-50"
            >
              {submit.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wrench className="h-3.5 w-3.5" />
              )}
              Submit maintenance ticket
            </button>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="md:col-span-3 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Your maintenance history
        </p>
        {isLoading ? (
          <TicketSkeletonList compact />
        ) : tickets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted-foreground">
            No maintenance tickets yet — you're all clear. Report an issue on the left when something needs your landlord's attention.
          </div>
        ) : (
          <ul className="space-y-3">
            {tickets.map((t) => (
              <li
                key={t.id}
                className="space-y-3 rounded-2xl border border-border bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Logged {new Date(t.created_at).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    {statusPill(t.status)}
                    {urgencyPill(t.urgency)}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{t.description}</p>
                <Photos paths={t.photo_urls || []} />
                {t.landlord_notes ? (
                  <div className="rounded-xl bg-surface-muted p-3 text-xs text-foreground">
                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Landlord response
                    </p>
                    {t.landlord_notes}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Landlord view
// ---------------------------------------------------------------------------

export function LandlordMaintenanceTab({
  propertyId,
  landlordId,
  address,
}: {
  propertyId: string;
  landlordId: string;
  address: string;
}) {
  const qc = useQueryClient();
  void landlordId; // reserved for future direct assignment / audit
  const { data: tickets = [], isLoading } = useTickets(
    propertyId,
    "landlord-maintenance-tickets",
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Status>("reported");

  const selected = tickets.find((t) => t.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId && tickets.length > 0) {
      setSelectedId(sortTickets(tickets)[0].id);
    }
  }, [tickets, selectedId]);

  useEffect(() => {
    if (selected) {
      setNotes(selected.landlord_notes ?? "");
      setStatus(selected.status);
    }
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: async (override: Status | undefined) => {
      if (!selected) return;
      const next = override ?? status;
      if (override) setStatus(override);
      const isResolved = next === "resolved";
      const { error } = await supabase
        .from("maintenance_tickets")
        .update({
          status: next,
          landlord_notes: notes.trim() || null,
          resolved_at: isResolved ? (selected.resolved_at ?? new Date().toISOString()) : null,
        } as never)
        .eq("id", selected.id);
      if (error) throw error;
      await emitNotification({
        data: {
          recipient_id: selected.tenant_id,
          type: isResolved ? "maintenance_resolved" : "maintenance_updated",
          entity_type: "maintenance_ticket",
          entity_id: selected.id,
          title: isResolved
            ? "Maintenance resolved"
            : `Maintenance updated — ${STATUS_LABEL[next]}`,
          body: isResolved
            ? `Your landlord marked "${selected.title}" as resolved at ${address}.`
            : notes.trim()
              ? `Landlord update on "${selected.title}": ${notes.trim().slice(0, 140)}`
              : `Status changed to ${STATUS_LABEL[next]} on "${selected.title}".`,
          link_path: `/tenant/tenancy?tab=maintenance`,
        },
      }).catch((err) => console.error("[notify]", err));
    },
    onSuccess: () => {
      toast.success("Ticket updated", { description: "Tenant has been notified." });
      qc.invalidateQueries({ queryKey: ["landlord-maintenance-tickets", propertyId] });
    },
    onError: (e: unknown) =>
      toast.error("Could not save", {
        description: e instanceof Error ? e.message : "Please try again.",
      }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <ClipboardList className="h-4 w-4 text-muted-foreground" /> Property maintenance tickets
      </div>

      {isLoading ? (
        <TicketSkeletonList />
      ) : tickets.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-surface p-8 text-center">
          <Check className="mx-auto mb-2 h-5 w-5 text-verified" />
          <p className="text-sm font-semibold text-foreground">No active maintenance tickets — all clear!</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
            When your tenant reports an issue it will appear here for you to triage, update, and mark resolved.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-5">
          {/* List */}
          <div className="md:col-span-2 space-y-2">
            {sortTickets(tickets).map((t) => {
              const active = selectedId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className={`w-full rounded-2xl border p-3 text-left transition ${
                    active
                      ? "border-foreground bg-surface-muted/60"
                      : "border-border bg-surface hover:border-foreground/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t.title}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Logged {new Date(t.created_at).toLocaleDateString("en-GB")}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {statusPill(t.status)}
                      {urgencyPill(t.urgency)}
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                    {t.description}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Editor */}
          <div className="md:col-span-3">
            {selected ? (
              <div className="space-y-4 rounded-3xl border border-border bg-surface p-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {URGENCY_LABEL[selected.urgency]}
                  </p>
                  <h3 className="mt-1 font-display text-lg font-semibold tracking-tight">
                    {selected.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{selected.description}</p>
                </div>

                <Photos paths={selected.photo_urls || []} />

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Update status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Status)}
                    className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-verified"
                  >
                    {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Response / contractor notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="e.g. Plumber booked for Tuesday at 10 AM."
                    className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-verified"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  {selected.status !== "resolved" ? (
                    <button
                      type="button"
                      onClick={() => save.mutate("resolved")}
                      disabled={save.isPending}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-verified bg-verified-soft px-4 py-2 text-xs font-semibold text-verified transition hover:brightness-95 disabled:opacity-60"
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={3} /> Mark resolved
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => save.mutate(undefined)}
                    disabled={save.isPending}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background shadow-sm transition hover:brightness-110 disabled:opacity-60"
                  >
                    {save.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    )}
                    Save & notify tenant
                  </button>
                </div>

                <div className="border-t border-border pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Audit log
                  </p>
                  <ol className="mt-2 space-y-1.5 border-l border-border pl-3 text-xs">
                    <li>
                      <span className="font-medium text-foreground">Reported by tenant</span>{" "}
                      <span className="text-muted-foreground">{fmtStamp(selected.created_at)}</span>
                    </li>
                    {selected.updated_at &&
                    selected.updated_at !== selected.created_at &&
                    selected.updated_at !== selected.resolved_at ? (
                      <li>
                        <span className="font-medium text-foreground">
                          Last updated · {STATUS_LABEL[selected.status]}
                        </span>{" "}
                        <span className="text-muted-foreground">{fmtStamp(selected.updated_at)}</span>
                      </li>
                    ) : null}
                    {selected.resolved_at ? (
                      <li>
                        <span className="font-medium text-verified">Marked resolved</span>{" "}
                        <span className="text-muted-foreground">{fmtStamp(selected.resolved_at)}</span>
                      </li>
                    ) : null}
                  </ol>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted-foreground">
                Select a ticket to review details, update status, or send contractor notes.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}