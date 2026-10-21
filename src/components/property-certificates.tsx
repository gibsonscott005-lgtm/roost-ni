import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const CERTIFICATES_BUCKET = "property-certificates";

export const CERTIFICATE_KINDS = [
  {
    key: "EPC",
    label: "Energy Performance Certificate",
    hint: "Required before a property is advertised. Valid for 10 years.",
  },
  {
    key: "Gas Safety",
    label: "Gas Safety Record (CP12)",
    hint: "Required annually where there is a gas appliance.",
  },
  {
    key: "Electrical",
    label: "Electrical safety (EICR)",
    hint: "Recommended every 5 years, or on change of tenancy.",
  },
  {
    key: "Alarms",
    label: "Smoke, heat & carbon monoxide alarms (interlinked)",
    hint: "Record the date the alarms were last checked.",
  },
  {
    key: "Other",
    label: "Other certificate",
    hint: "Oil tank inspection, boiler service, anything else you keep on file.",
  },
] as const;

export interface PropertyCertificate {
  id: string;
  property_id: string;
  landlord_id: string;
  kind: string;
  reference: string | null;
  issued_on: string | null;
  expires_on: string | null;
  document_path: string | null;
  notes: string | null;
  created_at: string;
}

export type CertificateState = "valid" | "expiring" | "expired" | "no-expiry";

export function certificateState(expires_on: string | null): {
  state: CertificateState;
  days: number | null;
} {
  if (!expires_on) return { state: "no-expiry", days: null };
  const days = Math.ceil(
    (new Date(`${expires_on}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0)) / 864e5,
  );
  if (days < 0) return { state: "expired", days };
  if (days <= 60) return { state: "expiring", days };
  return { state: "valid", days };
}

export function kindLabel(kind: string) {
  return CERTIFICATE_KINDS.find((k) => k.key === kind)?.label ?? kind;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function certificatesQueryKey(propertyId: string | null | undefined) {
  return ["property-certificates", propertyId] as const;
}

export function usePropertyCertificates(propertyId: string | null | undefined) {
  return useQuery({
    enabled: !!propertyId,
    queryKey: certificatesQueryKey(propertyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_certificates")
        .select("*")
        .eq("property_id", propertyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PropertyCertificate[];
    },
  });
}

export async function openCertificate(path: string) {
  const { data, error } = await supabase.storage
    .from(CERTIFICATES_BUCKET)
    .createSignedUrl(path, 120);
  if (error || !data?.signedUrl) {
    toast.error("Could not open the document", {
      description: error?.message ?? "Try again in a moment.",
    });
    return;
  }
  window.open(data.signedUrl, "_blank", "noopener");
}

function StateChip({ expires_on }: { expires_on: string | null }) {
  const { state, days } = certificateState(expires_on);
  const map: Record<CertificateState, { cx: string; text: string }> = {
    valid: {
      cx: "border-verified/30 bg-verified-soft/60 text-verified",
      text: `Valid until ${formatDate(expires_on)}`,
    },
    expiring: {
      cx: "border-amber-300 bg-amber-50 text-amber-700",
      text: days === 0 ? "Expires today" : `Expires in ${days} days`,
    },
    expired: {
      cx: "border-red-200 bg-red-50 text-red-700",
      text: `Expired ${formatDate(expires_on)}`,
    },
    "no-expiry": {
      cx: "border-border bg-surface-muted text-muted-foreground",
      text: "No expiry recorded",
    },
  };
  const s = map[state];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${s.cx}`}
    >
      {state === "expired" || state === "expiring" ? (
        <AlertTriangle className="h-3 w-3" />
      ) : (
        <CheckCircle2 className="h-3 w-3" />
      )}
      {s.text}
    </span>
  );
}

const inputCx =
  "mt-1.5 block h-11 w-full rounded-xl border border-border bg-surface shadow-resting px-3.5 text-sm text-foreground placeholder:text-muted-foreground/80 transition focus:border-verified/40 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-verified/20";

function Lbl({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </span>
  );
}

function AddCertificateForm({
  propertyId,
  landlordId,
  onDone,
}: {
  propertyId: string;
  landlordId: string;
  onDone: () => void;
}) {
  const [kind, setKind] = useState<string>(CERTIFICATE_KINDS[0].key);
  const [reference, setReference] = useState("");
  const [issued, setIssued] = useState("");
  const [expires, setExpires] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (saving) return;
    if (expires && issued && expires < issued) {
      toast.error("Expiry must be after the issue date");
      return;
    }
    setSaving(true);
    try {
      let documentPath: string | null = null;
      if (file) {
        if (file.size > 10 * 1024 * 1024) throw new Error("File must be 10 MB or smaller.");
        const ext = (file.name.split(".").pop() ?? "pdf").toLowerCase();
        documentPath = `${propertyId}/${crypto.randomUUID()}.${ext}`;
        const bytes = await file.arrayBuffer();
        const { error } = await supabase.storage
          .from(CERTIFICATES_BUCKET)
          .upload(documentPath, bytes, {
            contentType: file.type || "application/pdf",
            upsert: false,
          });
        if (error) throw error;
      }
      const { error } = await supabase.from("property_certificates").insert({
        property_id: propertyId,
        landlord_id: landlordId,
        kind,
        reference: reference.trim() || null,
        issued_on: issued || null,
        expires_on: expires || null,
        document_path: documentPath,
        notes: notes.trim() || null,
      } as never);
      if (error) throw error;
      toast.success("Certificate saved", {
        description: "Your tenant can see it once a tenancy is agreed.",
      });
      setReference("");
      setIssued("");
      setExpires("");
      setNotes("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      onDone();
    } catch (err: unknown) {
      toast.error("Could not save certificate", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const hint = CERTIFICATE_KINDS.find((k) => k.key === kind)?.hint;

  return (
    <div className="rounded-sm border border-border bg-surface-muted/50 p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <Lbl>Certificate</Lbl>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className={inputCx}>
            {CERTIFICATE_KINDS.map((k) => (
              <option key={k.key} value={k.key}>
                {k.label}
              </option>
            ))}
          </select>
          {hint ? (
            <span className="mt-1.5 block text-xs text-muted-foreground">{hint}</span>
          ) : null}
        </label>
        <label className="block">
          <Lbl>Reference number</Lbl>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Optional"
            className={inputCx}
          />
        </label>
        <label className="block">
          <Lbl>Issued on</Lbl>
          <input
            type="date"
            value={issued}
            onChange={(e) => setIssued(e.target.value)}
            className={inputCx}
          />
        </label>
        <label className="block">
          <Lbl>Expires on</Lbl>
          <input
            type="date"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
            className={inputCx}
          />
        </label>
        <label className="block">
          <Lbl>Document</Lbl>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1.5 block w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-xs file:mr-3 file:rounded-full file:border-0 file:bg-foreground file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[var(--color-primary-foreground)]"
          />
          <span className="mt-1.5 block text-xs text-muted-foreground">PDF or photo, up to 10 MB.</span>
        </label>
        <label className="block sm:col-span-2">
          <Lbl>Notes</Lbl>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Engineer, contractor or anything worth remembering"
            className={inputCx}
          />
        </label>
      </div>
      <button
        type="button"
        onClick={() => void submit()}
        disabled={saving}
        className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2.5 text-sm font-semibold text-[var(--color-primary-foreground)] transition hover:brightness-110 disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {saving ? "Saving…" : "Save certificate"}
      </button>
    </div>
  );
}

export function CertificateRow({
  cert,
  onDelete,
}: {
  cert: PropertyCertificate;
  onDelete?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-surface p-4">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FileText className="h-4 w-4 text-muted-foreground" />
          {kindLabel(cert.kind)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Issued {formatDate(cert.issued_on)}
          {cert.reference ? ` · Ref ${cert.reference}` : ""}
          {cert.notes ? ` · ${cert.notes}` : ""}
        </p>
        <div className="mt-2">
          <StateChip expires_on={cert.expires_on} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        {cert.document_path ? (
          <button
            type="button"
            onClick={() => void openCertificate(cert.document_path!)}
            className="rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-semibold transition hover:bg-secondary"
          >
            View document
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">No file attached</span>
        )}
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            aria-label="Remove certificate"
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-red-600 transition hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Landlord-facing certificate vault for one property. */
export function CertificatesPanel({
  propertyId,
  landlordId,
}: {
  propertyId: string;
  landlordId: string;
}) {
  const qc = useQueryClient();
  const { data, isPending } = usePropertyCertificates(propertyId);
  const [adding, setAdding] = useState(false);
  const certs = data ?? [];

  const missing = useMemo(
    () =>
      CERTIFICATE_KINDS.filter(
        (k) => k.key !== "Other" && !certs.some((c) => c.kind === k.key),
      ),
    [certs],
  );

  const remove = useMutation({
    mutationFn: async (cert: PropertyCertificate) => {
      if (cert.document_path) {
        await supabase.storage.from(CERTIFICATES_BUCKET).remove([cert.document_path]);
      }
      const { error } = await supabase
        .from("property_certificates")
        .delete()
        .eq("id", cert.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Certificate removed");
      await qc.invalidateQueries({ queryKey: certificatesQueryKey(propertyId) });
    },
    onError: (err: unknown) =>
      toast.error("Could not remove certificate", {
        description: err instanceof Error ? err.message : undefined,
      }),
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-verified" /> Safety certificates
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Keep EPC, gas, electrical and alarm records in one place. RoostNI stores what you upload
            and tracks the expiry date — it does not check the certificate itself.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-semibold transition hover:bg-secondary"
        >
          <Plus className="h-3.5 w-3.5" /> {adding ? "Close" : "Add certificate"}
        </button>
      </div>

      {adding ? (
        <div className="mb-4">
          <AddCertificateForm
            propertyId={propertyId}
            landlordId={landlordId}
            onDone={async () => {
              setAdding(false);
              await qc.invalidateQueries({ queryKey: certificatesQueryKey(propertyId) });
            }}
          />
        </div>
      ) : null}

      {isPending ? (
        <div className="space-y-2">
          <div className="h-20 animate-pulse rounded-sm bg-surface-muted" />
          <div className="h-20 animate-pulse rounded-sm bg-surface-muted" />
        </div>
      ) : certs.length === 0 ? (
        <div className="rounded-sm border border-dashed border-border bg-surface-muted/40 p-5 text-sm text-muted-foreground">
          No certificates on file yet. Add your EPC and, if the property has gas, the current Gas
          Safety Record.
        </div>
      ) : (
        <div className="space-y-2.5">
          {certs.map((c) => (
            <CertificateRow key={c.id} cert={c} onDelete={() => remove.mutate(c)} />
          ))}
        </div>
      )}

      {missing.length > 0 && !isPending ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Not on file: {missing.map((m) => m.label).join(", ")}.
        </p>
      ) : null}
    </div>
  );
}

/** Read-only list for tenants. */
export function TenantCertificatesPanel({ propertyId }: { propertyId: string }) {
  const { data, isPending } = usePropertyCertificates(propertyId);
  const certs = data ?? [];

  if (isPending) {
    return <div className="h-20 animate-pulse rounded-sm bg-surface-muted" />;
  }
  if (certs.length === 0) {
    return (
      <div className="rounded-sm border border-dashed border-border bg-surface-muted/40 p-5 text-sm text-muted-foreground">
        Your landlord hasn't uploaded any safety certificates yet. You're entitled to see the gas
        safety record and the EPC for the property.
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      {certs.map((c) => (
        <CertificateRow key={c.id} cert={c} />
      ))}
    </div>
  );
}

/** Compact status summary used on property cards. */
export function CertificateSummary({ propertyId }: { propertyId: string }) {
  const { data } = usePropertyCertificates(propertyId);
  const certs = data ?? [];
  if (certs.length === 0) return null;
  const expired = certs.filter((c) => certificateState(c.expires_on).state === "expired").length;
  const expiring = certs.filter((c) => certificateState(c.expires_on).state === "expiring").length;
  const cx = expired
    ? "border-red-200 bg-red-50 text-red-700"
    : expiring
      ? "border-amber-300 bg-amber-50 text-amber-700"
      : "border-verified/30 bg-verified-soft/60 text-verified";
  const text = expired
    ? `${expired} certificate${expired === 1 ? "" : "s"} expired`
    : expiring
      ? `${expiring} expiring soon`
      : `${certs.length} certificate${certs.length === 1 ? "" : "s"} on file`;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cx}`}
    >
      <ShieldCheck className="h-3 w-3" /> {text}
    </span>
  );
}