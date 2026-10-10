import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Banknote,
  Check,
  Calendar as CalendarIcon,
  ExternalLink,
  FileUp,
  IdCard,
  Loader2,
  Lock,
  ShieldCheck,
  TriangleAlert,
  UserRoundCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatFee, identityTier, type VerificationConfig } from "@/lib/identity-verification";
import {
  getVerificationConfig,
  resolveSimulatedVerification,
  startVerification,
} from "@/lib/identity-verification.functions";

export const Route = createFileRoute("/_authenticated/dashboard/passport/edit")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Edit Tenant Passport — RoostNI" },
      {
        name: "description",
        content:
          "Complete your Tenant Passport in three short steps. Self-certify your ID, income and references so landlords can review them when you apply.",
      },
    ],
  }),
  component: PassportEditPage,
});

const BUCKET = "tenant-documents";
const ACCEPT = "image/jpeg,image/png,application/pdf";
const MAX_BYTES = 10 * 1024 * 1024;

function describeDbError(err: unknown, fallback = "Please try again.") {
  const e = err as { code?: string; message?: string; details?: string; hint?: string } | null;
  const msg = (e?.message || (err instanceof Error ? err.message : "")) || fallback;
  return e?.code ? `[${e.code}] ${msg}` : msg;
}

type StepKey = "identity" | "income" | "references";

interface IncomeBreakdown {
  employment_gross_annual: number;
  universal_credit_annual: number;
  housing_element_annual: number;
  disability_benefits_annual: number;
  other_benefits_annual: number;
}

const EMPTY_BREAKDOWN: IncomeBreakdown = {
  employment_gross_annual: 0,
  universal_credit_annual: 0,
  housing_element_annual: 0,
  disability_benefits_annual: 0,
  other_benefits_annual: 0,
};

interface Passport {
  user_id: string;
  identity_verified: boolean;
  income_verified: boolean;
  reference_verified: boolean;
  monthly_income_net: number | null;
  id_document_type: string | null;
  id_document_number: string | null;
  id_document_path: string | null;
  id_status: string | null;
  id_verified_at: string | null;
  id_provider: string | null;
  id_failure_reason: string | null;
  verified_full_name: string | null;
  verified_date_of_birth: string | null;
  id_document_expiry: string | null;
  issuing_country: string | null;
  employment_status: string | null;
  annual_income: number | null;
  income_document_path: string | null;
  income_breakdown: IncomeBreakdown | null;
  willing_direct_payment_apa: boolean | null;
  previous_landlord_name: string | null;
  previous_landlord_email: string | null;
  previous_landlord_phone: string | null;
  tenancy_duration: string | null;
  reference_document_path: string | null;
  is_first_time_renter: boolean;
  guarantor_name: string | null;
  guarantor_address: string | null;
  guarantor_email: string | null;
  guarantor_phone: string | null;
  guarantor_employment_status: string | null;
  tenancy_start_date: string | null;
  tenancy_end_date: string | null;
  previous_landlord_name_2: string | null;
  previous_landlord_email_2: string | null;
  previous_landlord_phone_2: string | null;
  tenancy_start_date_2: string | null;
  tenancy_end_date_2: string | null;
}

const STEPS: { key: StepKey; label: string; sub: string }[] = [
  { key: "identity", label: "Identity", sub: "Step 1" },
  { key: "income", label: "Income verification", sub: "Step 2" },
  { key: "references", label: "Character references", sub: "Step 3" },
];

function firstIncompleteStep(p: Passport): number {
  const identityDone =
    !!p.identity_verified || (!!p.id_document_path && !!p.id_document_type);
  if (!identityDone) return 0;
  const incomeDone =
    !!p.income_verified ||
    (!!p.employment_status && !!p.annual_income && !!p.income_document_path);
  if (!incomeDone) return 1;
  const refsDone =
    !!p.reference_verified ||
    (p.is_first_time_renter ? !!p.guarantor_name : !!p.previous_landlord_name);
  if (!refsDone) return 2;
  return 2;
}

function PassportEditPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [passport, setPassport] = useState<Passport | null>(null);
  const [loading, setLoading] = useState(true);

  const isTenant = !profile || profile.account_type === "tenant";

  const load = async () => {
    if (!user) return;
    try {
      const { data: existing, error: selErr } = await supabase
        .from("tenant_passports")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (selErr) throw selErr;
      if (existing) {
        setPassport(existing as Passport);
        setStepIndex(firstIncompleteStep(existing as Passport));
      } else {
        const { data: upserted, error: upErr } = await supabase
          .from("tenant_passports")
          .upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: false })
          .select("*")
          .single();
        if (upErr) throw upErr;
        setPassport(upserted as Passport);
      }
      setLoading(false);
    } catch (err: unknown) {
      toast.error("Couldn't load passport", { description: describeDbError(err) });
      // keep loading=true so existing UI isn't replaced with an empty default
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  const goNext = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0));

  return (
    <DashboardShell user={user} profile={profile} activeKey="passport">
      {!isTenant ? (
        <div className="rounded-3xl border border-border bg-surface p-6 text-sm text-muted-foreground sm:p-8">
          The Tenant Passport editor is available for tenant accounts only.
        </div>
      ) : (
        <div>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Tenant Passport
              </p>
              <h2 className="mt-1 font-display text-xl font-semibold tracking-tight sm:text-2xl">
                Complete your passport
              </h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Three short steps to a self-certified passport. Save progress at any time — your
                uploaded documents are shared securely with landlords when you apply. RoostNI does
                not run background checks.
              </p>
            </div>
            <Link
              to="/dashboard"
              className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-medium text-foreground transition hover:bg-secondary sm:inline-flex"
            >
              View passport
            </Link>
          </div>

          <Stepper passport={passport} stepIndex={stepIndex} onJump={setStepIndex} />

          {loading || !passport ? (
            <div className="mt-6 rounded-3xl border border-border bg-surface p-10 text-center text-sm text-muted-foreground">
              <Loader2 className="mx-auto h-5 w-5 animate-spin" />
              <p className="mt-2">Loading your passport…</p>
            </div>
          ) : (
            <div className="mt-6">
              {STEPS[stepIndex].key === "identity" ? (
                <IdentityStep
                  passport={passport}
                  onSaved={(p) => {
                    setPassport(p);
                    goNext();
                  }}
                  onBack={null}
                />
              ) : STEPS[stepIndex].key === "income" ? (
                <IncomeStep
                  passport={passport}
                  onSaved={(p) => {
                    setPassport(p);
                    goNext();
                  }}
                  onBack={goBack}
                />
              ) : (
                <ReferencesStep
                  passport={passport}
                  onSaved={(p) => {
                    setPassport(p);
                    toast.success("Passport complete", {
                      description: "Your self-certified passport is ready to share with landlords.",
                    });
                    navigate({ to: "/dashboard" });
                  }}
                  onBack={goBack}
                />
              )}
            </div>
          )}

          <p className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <Lock className="h-3 w-3" />
            Documents stored privately. Shared securely with landlords when you apply — RoostNI does
            not run background checks.
          </p>
        </div>
      )}
    </DashboardShell>
  );
}

function Stepper({
  passport,
  stepIndex,
  onJump,
}: {
  passport: Passport | null;
  stepIndex: number;
  onJump: (i: number) => void;
}) {
  const p = passport;
  const flags = [
    !!p?.identity_verified || (!!p?.id_document_path && !!p?.id_document_type),
    !!p?.income_verified ||
      (!!p?.employment_status && !!p?.annual_income && !!p?.income_document_path),
    !!p?.reference_verified ||
      (p?.is_first_time_renter ? !!p?.guarantor_name : !!p?.previous_landlord_name),
  ];
  return (
    <ol className="grid grid-cols-3 gap-2 sm:gap-3">
      {STEPS.map((s, i) => {
        const done = flags[i];
        const active = i === stepIndex;
        return (
          <li key={s.key}>
            <button
              type="button"
              onClick={() => onJump(i)}
              className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition sm:p-4 ${
                active
                  ? "border-verified/40 bg-verified-soft/50"
                  : done
                    ? "border-verified/30 bg-surface hover:bg-verified-soft/40"
                    : "border-border bg-surface hover:bg-secondary"
              }`}
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                  done
                    ? "bg-verified text-[var(--color-verified-foreground)]"
                    : active
                      ? "border border-verified bg-surface text-verified"
                      : "bg-secondary text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {s.sub}
                </span>
                <span className="block truncate font-display text-sm font-semibold tracking-tight text-foreground">
                  {s.label}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function StepCard({
  icon: Icon,
  eyebrow,
  title,
  desc,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-surface p-5 shadow-floating sm:p-7">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-foreground">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </p>
          <h3 className="mt-1 font-display text-lg font-semibold tracking-tight sm:text-xl">
            {title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
        </div>
      </div>
      <div className="mt-6 space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

const inputCx =
  "mt-1.5 block h-11 w-full rounded-xl border border-border bg-surface shadow-resting px-3.5 text-sm text-foreground placeholder:text-muted-foreground/80 transition focus:border-verified/40 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-verified/20";

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const date = value ? new Date(`${value}T00:00:00`) : undefined;
  const currentYear = new Date().getFullYear();
  return (
    <Field label={label}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`${inputCx} flex items-center justify-between text-left`}
          >
            <span className={date ? "" : "text-muted-foreground/80"}>
              {date ? format(date, "d MMM yyyy") : "Select date"}
            </span>
            <CalendarIcon className="ml-2 h-4 w-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              if (d) {
                onChange(format(d, "yyyy-MM-dd"));
                setOpen(false);
              }
            }}
            captionLayout="dropdown"
            startMonth={new Date(currentYear - 30, 0)}
            endMonth={new Date(currentYear + 1, 11)}
            defaultMonth={date ?? new Date()}
            disabled={{ after: new Date(currentYear + 1, 11, 31) }}
            className="pointer-events-auto p-3"
          />
        </PopoverContent>
      </Popover>
    </Field>
  );
}

function FileDrop({
  label,
  currentPath,
  file,
  onSelect,
}: {
  label: string;
  currentPath: string | null;
  file: File | null;
  onSelect: (file: File | null) => void;
}) {
  const [hover, setHover] = useState(false);
  const [opening, setOpening] = useState(false);

  const onPick = (f: File | null) => {
    if (!f) {
      onSelect(null);
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error("File too large", { description: "Maximum file size is 10 MB." });
      return;
    }
    if (!ACCEPT.split(",").includes(f.type)) {
      toast.error("Unsupported file type", { description: "Upload a JPG, PNG or PDF." });
      return;
    }
    onSelect(f);
  };

  const onViewCurrent = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentPath || opening) return;
    setOpening(true);
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(currentPath, 60);
      if (error || !data?.signedUrl) throw error ?? new Error("No URL");
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error("Couldn't open file", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setOpening(false);
    }
  };

  return (
    <div>
      <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setHover(true);
        }}
        onDragLeave={() => setHover(false)}
        onDrop={(e) => {
          e.preventDefault();
          setHover(false);
          onPick(e.dataTransfer.files?.[0] ?? null);
        }}
        className={`mt-1.5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-7 text-center transition ${
          hover
            ? "border-verified/60 bg-verified-soft/40"
            : "border-border bg-surface-muted hover:border-verified/40"
        }`}
      >
        <input
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
        <span className="grid h-10 w-10 place-items-center rounded-full bg-surface text-foreground/80 shadow-sm">
          <FileUp className="h-4 w-4" />
        </span>
        {file ? (
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-foreground">{file.name}</span>
            <span className="text-xs text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(2)} MB · Replace
            </span>
          </span>
        ) : currentPath ? (
          <span>
            <span className="block text-sm font-medium text-foreground">Document on file</span>
            <span className="text-xs text-muted-foreground">Tap to replace</span>
            <button
              type="button"
              onClick={onViewCurrent}
              disabled={opening}
              className="mt-2 inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-foreground transition hover:bg-secondary disabled:opacity-60"
            >
              {opening ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ExternalLink className="h-3 w-3" />
              )}
              View current file
            </button>
          </span>
        ) : (
          <span>
            <span className="block text-sm font-medium text-foreground">
              Drag & drop or click to upload
            </span>
            <span className="text-xs text-muted-foreground">JPG, PNG or PDF · up to 10 MB</span>
          </span>
        )}
      </label>
    </div>
  );
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heic",
};

export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadError";
  }
}

function isNetworkFetchError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof TypeError) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /failed to fetch|network|load failed/i.test(msg);
}

async function uploadDoc(userId: string, folder: string, file: File): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError("File is larger than 10 MB — please upload a smaller copy.");
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${userId}/${folder}/${Date.now()}.${ext}`;
  const contentType =
    CONTENT_TYPE_BY_EXT[ext] || file.type || "application/octet-stream";

  // Snapshot the bytes immediately — iOS Safari can drop the underlying file
  // reference (especially iCloud-backed PDFs) and abort the fetch mid-stream.
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    throw new UploadError("Couldn't read the selected file — please pick it again.");
  }

  const attempt = async () => {
    const body = new Blob([buffer], { type: contentType });
    const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
      cacheControl: "3600",
      upsert: false,
      contentType,
    });
    if (error) throw error;
  };

  try {
    await attempt();
  } catch (err) {
    if (!isNetworkFetchError(err)) throw err;
    // Mobile Safari often succeeds on an immediate retry after the first stall.
    await new Promise((r) => setTimeout(r, 400));
    try {
      await attempt();
    } catch (retryErr) {
      if (isNetworkFetchError(retryErr)) {
        throw new UploadError(
          "Upload didn't complete — please try again on a stable connection.",
        );
      }
      throw retryErr;
    }
  }
  return path;
}

function StepActions({
  onBack,
  saving,
  submitLabel,
}: {
  onBack: (() => void) | null;
  saving: boolean;
  submitLabel: string;
}) {
  return (
    <div className="mt-2 flex items-center justify-between gap-3">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-secondary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
      ) : (
        <span />
      )}
      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-1.5 rounded-full bg-verified px-5 py-2.5 text-sm font-semibold text-[var(--color-verified-foreground)] shadow-verified transition hover:brightness-95 disabled:opacity-70"
      >
        {saving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <BadgeCheck className="h-3.5 w-3.5" />
        )}
        {saving ? "Saving…" : submitLabel}
        {!saving ? <ArrowRight className="h-3.5 w-3.5" /> : null}
      </button>
    </div>
  );
}

/**
 * The real identity check. Deliberately separate from the document upload
 * below it: attaching a photo of an ID and proving the ID is yours are two
 * different claims, and landlords are shown them as two different things.
 */
function VerifyIdentityPanel({
  passport,
  onSaved,
}: {
  passport: Passport;
  onSaved: (p: Passport) => void;
}) {
  const [config, setConfig] = useState<VerificationConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const tier = identityTier(passport);

  useEffect(() => {
    let active = true;
    getVerificationConfig()
      .then((c) => {
        if (active) setConfig(c);
      })
      .catch(() => {
        if (active) setConfig(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const begin = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await startVerification({
        data: { returnPath: "/dashboard/passport/edit" },
      });
      if (res.redirectUrl) {
        window.location.href = res.redirectUrl;
        return;
      }
      toast.info("Simulated check started", {
        description: "No payment was taken. Run the check to continue testing.",
      });
      setConfig((c) => (c ? { ...c } : c));
      onSaved({ ...passport, id_status: "pending", id_failure_reason: null });
    } catch (err: unknown) {
      toast.error("Could not start the check", { description: describeDbError(err) });
    } finally {
      setBusy(false);
    }
  };

  const resolve = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await resolveSimulatedVerification();
      if (res.outcome === "verified") {
        toast.success("Identity verified", {
          description: "Landlords will see a verified ID badge on your applications.",
        });
      } else {
        toast.error("Check did not complete", {
          description: "You can try again — this does not affect your passport.",
        });
      }
      onSaved(res.passport as unknown as Passport);
    } catch (err: unknown) {
      toast.error("Could not finish the check", { description: describeDbError(err) });
    } finally {
      setBusy(false);
    }
  };

  if (tier === "verified") {
    return (
      <div className="rounded-2xl border border-verified/30 bg-verified-soft px-4 py-3.5">
        <p className="flex items-center gap-2 text-sm font-semibold text-verified">
          <ShieldCheck className="h-4 w-4" strokeWidth={2.5} />
          Identity verified
        </p>
        <p className="mt-1.5 text-xs text-verified/90">
          {passport.verified_full_name ? `Verified as ${passport.verified_full_name}. ` : ""}
          Your document was checked for authenticity and matched to your face
          {passport.id_verified_at
            ? ` on ${format(new Date(passport.id_verified_at), "d MMM yyyy")}`
            : ""}
          . This carries across every application you make.
        </p>
      </div>
    );
  }

  const simulated = config?.mode === "simulated";

  return (
    <div className="rounded-2xl border border-border bg-surface-muted/50 px-4 py-3.5">
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
        Verify your identity
        {config ? (
          <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {formatFee(config.feePence)} one-off
          </span>
        ) : null}
      </p>
      <p className="mt-1.5 text-xs text-muted-foreground">
        A checked ID is the strongest thing on your passport. You pay once and it applies to
        every landlord you apply to — no repeat referencing fees. RoostNI still does not
        recommend you to landlords; the decision is always theirs.
      </p>

      {tier === "failed" ? (
        <p className="mt-3 flex gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            The last check did not complete
            {passport.id_failure_reason ? `: ${passport.id_failure_reason}` : ""}. Checks fail for
            ordinary reasons like lighting or an expired document — you can try again.
          </span>
        </p>
      ) : null}

      {simulated && tier === "pending" ? (
        <div className="mt-3 rounded-xl border border-dashed border-border bg-surface p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Test mode — no payment, no provider
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Run the check against the identity document on your passport — the result is decided
            by what is on file, not by you. Real checks replace this screen once a provider is
            connected.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => resolve()}
              className="inline-flex items-center gap-1.5 rounded-full bg-verified px-4 py-2 text-xs font-semibold text-[var(--color-verified-foreground)] transition hover:brightness-95 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              Run the simulated check
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy || !config}
          onClick={begin}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition hover:opacity-90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
          {tier === "failed" ? "Try the check again" : "Start identity check"}
        </button>
      )}

      {simulated ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Test mode is on, so nothing is charged and no real check is performed.
        </p>
      ) : null}
    </div>
  );
}

function IdentityStep({
  passport,
  onSaved,
  onBack,
}: {
  passport: Passport;
  onSaved: (p: Passport) => void;
  onBack: (() => void) | null;
}) {
  const { user } = useAuth();
  const [docType, setDocType] = useState<string>(passport.id_document_type ?? "passport");
  const [docNumber, setDocNumber] = useState(passport.id_document_number ?? "");
  const [country, setCountry] = useState<string>(passport.issuing_country ?? "GB");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || saving) return;
    if (!file && !passport.id_document_path) {
      toast.error("Please upload your ID document");
      return;
    }
    setSaving(true);
    try {
      let path = passport.id_document_path;
      if (file) path = await uploadDoc(user.id, "identity", file);
      const verifiedAt = new Date().toISOString();
      const { data, error } = await supabase
        .from("tenant_passports")
        .upsert(
          {
            user_id: user.id,
            id_document_type: docType,
            id_document_number: docNumber,
            id_document_path: path,
            identity_verified: true,
            id_status: "self_certified",
            id_verified_at: verifiedAt,
            id_provider: "self_certified",
            issuing_country: country,
          },
          { onConflict: "user_id" },
        )
        .select("*")
        .single();
      if (error) throw error;
      // Append-only audit entry — RLS lets tenants insert their own rows only.
      const { error: auditErr } = await supabase
        .from("verification_audit_logs")
        .insert({
          tenant_id: user.id,
          provider: "self_certified",
          session_id: `self-${user.id}-${Date.now()}`,
          event_type: "self_certified_id_submitted",
          payload: {
            timestamp: verifiedAt,
            document_path: path,
            document_type: docType,
            issuing_country: country,
          },
        });
      if (auditErr) console.error("[verification_audit_logs]", auditErr);
      toast.success("Identity document saved", {
        description:
          "Landlords can see the document you attached. Verify your ID to prove it is genuinely yours.",
      });
      onSaved(data as Passport);
    } catch (err: unknown) {
      toast.error("Could not save", {
        description: describeDbError(err),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <StepCard
        icon={IdCard}
        eyebrow="Step 01"
        title="Identity"
        desc="Attach your government photo ID so landlords can see it, then verify it so they know it is genuinely yours."
      >
        <VerifyIdentityPanel passport={passport} onSaved={onSaved} />

        {passport.id_status === "self_certified" && passport.id_verified_at ? (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">
            <Check className="h-4 w-4 shrink-0" strokeWidth={3} />
            <span className="min-w-0">
              <span className="font-semibold">Document attached (self-certified)</span>
              <span className="ml-1.5 text-xs text-emerald-700/80">
                {passport.issuing_country ?? "GB"} · {format(new Date(passport.id_verified_at), "d MMM yyyy")}
              </span>
            </span>
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Document type">
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className={inputCx}
            >
              <option value="passport">UK / EU Passport</option>
              <option value="driving_licence">UK Driving Licence</option>
            </select>
          </Field>
          <Field label="Document number">
            <input
              required
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value.toUpperCase())}
              placeholder="e.g. 123456789"
              className={`${inputCx} uppercase tracking-wider`}
            />
          </Field>
          <Field label="Issuing country" className="sm:col-span-2">
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={inputCx}
            >
              <option value="GB">United Kingdom (GB)</option>
              <option value="IE">Ireland (IE)</option>
              <option value="EU">Other EU / EEA</option>
              <option value="OTHER">Other</option>
            </select>
          </Field>
        </div>
        <FileDrop
          label="Upload a clear photo or scan"
          currentPath={passport.id_document_path}
          file={file}
          onSelect={setFile}
        />
        <StepActions onBack={onBack} saving={saving} submitLabel="Save & continue" />
      </StepCard>
    </form>
  );
}

function IncomeStep({
  passport,
  onSaved,
  onBack,
}: {
  passport: Passport;
  onSaved: (p: Passport) => void;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const [status, setStatus] = useState(passport.employment_status ?? "permanent_full_time");
  const initialBd: IncomeBreakdown = {
    ...EMPTY_BREAKDOWN,
    ...(passport.income_breakdown ?? {}),
  };
  const [employment, setEmployment] = useState(String(initialBd.employment_gross_annual || ""));
  const [uc, setUc] = useState(String(initialBd.universal_credit_annual || ""));
  const [housing, setHousing] = useState(String(initialBd.housing_element_annual || ""));
  const [disability, setDisability] = useState(String(initialBd.disability_benefits_annual || ""));
  const [otherBen, setOtherBen] = useState(String(initialBd.other_benefits_annual || ""));
  const [apa, setApa] = useState<boolean>(!!passport.willing_direct_payment_apa);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const num = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  const breakdown: IncomeBreakdown = {
    employment_gross_annual: num(employment),
    universal_credit_annual: num(uc),
    housing_element_annual: num(housing),
    disability_benefits_annual: num(disability),
    other_benefits_annual: num(otherBen),
  };
  const totalAnnual =
    breakdown.employment_gross_annual +
    breakdown.universal_credit_annual +
    breakdown.housing_element_annual +
    breakdown.disability_benefits_annual +
    breakdown.other_benefits_annual;
  const benefitsTotal =
    breakdown.universal_credit_annual +
    breakdown.housing_element_annual +
    breakdown.disability_benefits_annual +
    breakdown.other_benefits_annual;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || saving) return;
    if (totalAnnual <= 0) {
      toast.error("Enter at least one income source");
      return;
    }
    if (!file && !passport.income_document_path) {
      toast.error("Please upload a payslip or tax summary");
      return;
    }
    setSaving(true);
    try {
      let path = passport.income_document_path;
      if (file) path = await uploadDoc(user.id, "income", file);
      const { data, error } = await supabase
        .from("tenant_passports")
        .upsert(
          {
            user_id: user.id,
            employment_status: status,
            annual_income: totalAnnual,
            monthly_income_net: Math.round((totalAnnual / 12) * 100) / 100,
            income_breakdown: breakdown as unknown as Record<string, number>,
            willing_direct_payment_apa: apa,
            income_document_path: path,
          },
          { onConflict: "user_id" },
        )
        .select("*")
        .single();
      if (error) throw error;
      toast.success("Income saved");
      onSaved(data as Passport);
    } catch (err: unknown) {
      toast.error("Could not save", {
        description: describeDbError(err),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <StepCard
        icon={Banknote}
        eyebrow="Step 02"
        title="Income verification"
        desc="Break down each income source. Benefits (Universal Credit, Housing Element, PIP, etc.) are counted separately so landlords see your full affordability picture."
      >
        <Field label="Employment status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={inputCx}
          >
            <option value="permanent_full_time">Permanent · Full-time</option>
            <option value="permanent_part_time">Permanent · Part-time</option>
            <option value="self_employed">Self-employed</option>
            <option value="contract">Contract</option>
            <option value="student">Student</option>
            <option value="retired">Retired</option>
            <option value="unemployed">Not currently employed</option>
          </select>
        </Field>

        <div className="mt-4 rounded-2xl border border-border bg-surface-muted/40 p-4">
          <p className="font-display text-sm font-semibold tracking-tight text-foreground">
            Annual income breakdown
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Enter yearly amounts (£). Leave blank or 0 for anything that doesn't apply.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CurrencyField
              label="Gross salary / self-employment"
              hint="Before tax, from employment or trading"
              value={employment}
              onChange={setEmployment}
              placeholder="24000"
            />
            <CurrencyField
              label="Universal Credit (standard allowance)"
              hint="Excluding housing element"
              value={uc}
              onChange={setUc}
              placeholder="4200"
            />
            <CurrencyField
              label="Housing Element"
              hint="LHA / housing costs portion of UC"
              value={housing}
              onChange={setHousing}
              placeholder="7200"
            />
            <CurrencyField
              label="Disability benefits"
              hint="PIP, DLA, Carer's Allowance"
              value={disability}
              onChange={setDisability}
              placeholder="0"
            />
            <CurrencyField
              label="Other benefits"
              hint="Child Benefit, Tax Credits, etc."
              value={otherBen}
              onChange={setOtherBen}
              placeholder="0"
            />
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs">
            <span className="font-semibold uppercase tracking-wider text-emerald-700">
              Total annual income
            </span>
            <span className="font-display text-base font-semibold tracking-tight text-emerald-800">
              £{totalAnnual.toLocaleString()}
            </span>
          </div>
        </div>

        {benefitsTotal > 0 ? (
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3">
            <input
              type="checkbox"
              checked={apa}
              onChange={(e) => setApa(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-emerald-600"
            />
            <span className="min-w-0">
              <span className="block font-display text-sm font-semibold tracking-tight text-foreground">
                Willing to set up Direct Payment (APA) to landlord
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Your Housing Element would be paid direct to the landlord under an Alternative Payment Arrangement — many landlords see this as a strong affordability signal.
              </span>
            </span>
          </label>
        ) : null}

        <FileDrop
          label="Recent payslip or HMRC tax summary"
          currentPath={passport.income_document_path}
          file={file}
          onSelect={setFile}
        />
        <StepActions onBack={onBack} saving={saving} submitLabel="Save & continue" />
      </StepCard>
    </form>
  );
}

function CurrencyField({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-foreground">{label}</span>
      {hint ? <span className="mt-0.5 block text-[11px] text-muted-foreground">{hint}</span> : null}
      <div className="mt-1.5 relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">£</span>
        <input
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder={placeholder}
          className={`${inputCx} pl-7`}
        />
      </div>
    </label>
  );
}

function ReferencesStep({
  passport,
  onSaved,
  onBack,
}: {
  passport: Passport;
  onSaved: (p: Passport) => void;
  onBack: () => void;
}) {
  const { user } = useAuth();
  // Default branch: prefer whichever side already has data; otherwise No.
  const initialFirstTime =
    passport.is_first_time_renter ||
    (!passport.previous_landlord_name && !!passport.guarantor_name);
  const [firstTime, setFirstTime] = useState<boolean>(initialFirstTime);

  // Guarantor (Branch A)
  const [gName, setGName] = useState(passport.guarantor_name ?? "");
  const [gAddress, setGAddress] = useState(passport.guarantor_address ?? "");
  const [gEmail, setGEmail] = useState(passport.guarantor_email ?? "");
  const [gPhone, setGPhone] = useState(passport.guarantor_phone ?? "");
  const [gEmployment, setGEmployment] = useState(
    passport.guarantor_employment_status ?? "permanent_full_time",
  );

  // Landlord 1 (Branch B)
  const [name, setName] = useState(passport.previous_landlord_name ?? "");
  const [email, setEmail] = useState(passport.previous_landlord_email ?? "");
  const [phone, setPhone] = useState(passport.previous_landlord_phone ?? "");
  const [start1, setStart1] = useState(passport.tenancy_start_date ?? "");
  const [end1, setEnd1] = useState(passport.tenancy_end_date ?? "");

  // Landlord 2 (Branch B, conditional)
  const [name2, setName2] = useState(passport.previous_landlord_name_2 ?? "");
  const [email2, setEmail2] = useState(passport.previous_landlord_email_2 ?? "");
  const [phone2, setPhone2] = useState(passport.previous_landlord_phone_2 ?? "");
  const [start2, setStart2] = useState(passport.tenancy_start_date_2 ?? "");
  const [end2, setEnd2] = useState(passport.tenancy_end_date_2 ?? "");

  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const months1 = monthsBetween(start1, end1);
  const needsSecond = !firstTime && months1 !== null && months1 < 36;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || saving) return;

    if (firstTime) {
      if (
        !gName.trim() ||
        !gAddress.trim() ||
        !gEmail.trim() ||
        !gPhone.trim() ||
        !gEmployment.trim()
      ) {
        toast.error("Please complete every guarantor field");
        return;
      }
    } else {
      if (!name.trim() || !email.trim() || !phone.trim() || !start1 || !end1) {
        toast.error("Please complete every landlord field");
        return;
      }
      if (months1 === null || months1 <= 0) {
        toast.error("Tenancy end date must be after the start date");
        return;
      }
      if (needsSecond) {
        if (!name2.trim() || !email2.trim() || !phone2.trim() || !start2 || !end2) {
          toast.error("Add a second landlord to cover the last 3 years");
          return;
        }
        const m2 = monthsBetween(start2, end2);
        if (m2 === null || m2 <= 0) {
          toast.error("Second tenancy end date must be after the start date");
          return;
        }
      }
    }

    setSaving(true);
    try {
      let path = passport.reference_document_path;
      if (file) path = await uploadDoc(user.id, "references", file);

      const base = {
        reference_document_path: path,
        is_first_time_renter: firstTime,
      };

      const branch = firstTime
        ? {
            guarantor_name: gName.trim(),
            guarantor_address: gAddress.trim(),
            guarantor_email: gEmail.trim(),
            guarantor_phone: gPhone.trim(),
            guarantor_employment_status: gEmployment,
            // Clear landlord branch
            previous_landlord_name: null,
            previous_landlord_email: null,
            previous_landlord_phone: null,
            tenancy_start_date: null,
            tenancy_end_date: null,
            previous_landlord_name_2: null,
            previous_landlord_email_2: null,
            previous_landlord_phone_2: null,
            tenancy_start_date_2: null,
            tenancy_end_date_2: null,
          }
        : {
            previous_landlord_name: name.trim(),
            previous_landlord_email: email.trim(),
            previous_landlord_phone: phone.trim(),
            tenancy_start_date: start1,
            tenancy_end_date: end1,
            previous_landlord_name_2: needsSecond ? name2.trim() : null,
            previous_landlord_email_2: needsSecond ? email2.trim() : null,
            previous_landlord_phone_2: needsSecond ? phone2.trim() : null,
            tenancy_start_date_2: needsSecond ? start2 : null,
            tenancy_end_date_2: needsSecond ? end2 : null,
            // Clear guarantor branch
            guarantor_name: null,
            guarantor_address: null,
            guarantor_email: null,
            guarantor_phone: null,
            guarantor_employment_status: null,
          };

      const { data, error } = await supabase
        .from("tenant_passports")
        .upsert({ user_id: user.id, ...base, ...branch }, { onConflict: "user_id" })
        .select("*")
        .single();
      if (error) throw error;
      onSaved(data as Passport);
    } catch (err: unknown) {
      toast.error("Could not save", {
        description: describeDbError(err),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <StepCard
        icon={UserRoundCheck}
        eyebrow="Step 03"
        title="Character references"
        desc="Tell us about your rental history. We'll either collect landlord references or guarantor details depending on your situation."
      >
        <div>
          <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Is this your first time renting a property?
          </span>
          <div
            role="radiogroup"
            className="mt-1.5 inline-flex rounded-full border border-border bg-surface-muted p-1"
          >
            {[
              { v: false, label: "No, I've rented before" },
              { v: true, label: "Yes, first time" },
            ].map((opt) => {
              const active = firstTime === opt.v;
              return (
                <button
                  key={String(opt.v)}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setFirstTime(opt.v)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-verified text-[var(--color-verified-foreground)] shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {firstTime ? (
          <div className="space-y-4 rounded-2xl border border-border bg-surface-muted/40 p-4 sm:p-5">
            <div>
              <h4 className="font-display text-base font-semibold tracking-tight text-foreground">
                Guarantor details
              </h4>
              <p className="mt-1 text-xs text-muted-foreground">
                Landlords require first-time renters to provide a UK-based guarantor who can
                cover rent liabilities if needed.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Guarantor full name" className="sm:col-span-2">
                <input
                  required
                  value={gName}
                  onChange={(e) => setGName(e.target.value)}
                  placeholder="John Doherty"
                  className={inputCx}
                />
              </Field>
              <Field label="UK residential address" className="sm:col-span-2">
                <textarea
                  required
                  value={gAddress}
                  onChange={(e) => setGAddress(e.target.value)}
                  placeholder="12 Malone Road, Belfast, BT9 5BN"
                  rows={2}
                  className={`${inputCx} h-auto min-h-[72px] py-2.5`}
                />
              </Field>
              <Field label="Email">
                <input
                  required
                  type="email"
                  value={gEmail}
                  onChange={(e) => setGEmail(e.target.value)}
                  placeholder="john@example.com"
                  className={inputCx}
                />
              </Field>
              <Field label="Phone">
                <input
                  required
                  type="tel"
                  value={gPhone}
                  onChange={(e) => setGPhone(e.target.value)}
                  placeholder="+44 7700 900123"
                  className={inputCx}
                />
              </Field>
              <Field label="Employment / income status" className="sm:col-span-2">
                <select
                  value={gEmployment}
                  onChange={(e) => setGEmployment(e.target.value)}
                  className={inputCx}
                >
                  <option value="permanent_full_time">Permanent · Full-time</option>
                  <option value="permanent_part_time">Permanent · Part-time</option>
                  <option value="self_employed">Self-employed</option>
                  <option value="contract">Contract</option>
                  <option value="retired">Retired</option>
                </select>
              </Field>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-4 rounded-2xl border border-border bg-surface-muted/40 p-4 sm:p-5">
              <h4 className="font-display text-base font-semibold tracking-tight text-foreground">
                Most recent landlord
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Landlord's full name" className="sm:col-span-2">
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Margaret Doherty"
                    className={inputCx}
                  />
                </Field>
                <Field label="Email">
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="margaret@example.com"
                    className={inputCx}
                  />
                </Field>
                <Field label="Phone">
                  <input
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+44 7700 900123"
                    className={inputCx}
                  />
                </Field>
                <DateField label="Tenancy start date" value={start1} onChange={setStart1} />
                <DateField label="Tenancy end date" value={end1} onChange={setEnd1} />
              </div>
              {months1 !== null && months1 > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Tenancy length: {months1} {months1 === 1 ? "month" : "months"}
                  {months1 >= 36 ? " — covers the full 3-year history." : ""}
                </p>
              ) : null}
            </div>

            {needsSecond ? (
              <div className="space-y-4 rounded-2xl border border-border bg-surface-muted/40 p-4 sm:p-5">
                <div>
                  <h4 className="font-display text-base font-semibold tracking-tight text-foreground">
                    Previous landlord reference
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Add an earlier landlord so we cover the last 3 years of your history.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Landlord's full name" className="sm:col-span-2">
                    <input
                      required
                      value={name2}
                      onChange={(e) => setName2(e.target.value)}
                      placeholder="Patrick O'Neill"
                      className={inputCx}
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      required
                      type="email"
                      value={email2}
                      onChange={(e) => setEmail2(e.target.value)}
                      placeholder="patrick@example.com"
                      className={inputCx}
                    />
                  </Field>
                  <Field label="Phone">
                    <input
                      required
                      type="tel"
                      value={phone2}
                      onChange={(e) => setPhone2(e.target.value)}
                      placeholder="+44 7700 900456"
                      className={inputCx}
                    />
                  </Field>
                  <DateField label="Tenancy start date" value={start2} onChange={setStart2} />
                  <DateField label="Tenancy end date" value={end2} onChange={setEnd2} />
                </div>
              </div>
            ) : null}
          </div>
        )}

        <FileDrop
          label={firstTime ? "Supporting document (optional)" : "Reference letter (optional)"}
          currentPath={passport.reference_document_path}
          file={file}
          onSelect={setFile}
        />
        <p className="text-xs text-muted-foreground">
          Optional — attach a written reference or supporting document if you have one.
        </p>
        <StepActions onBack={onBack} saving={saving} submitLabel="Save & finish" />
      </StepCard>
    </form>
  );
}

function monthsBetween(start: string, end: string): number | null {
  if (!start || !end) return null;
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
  const ms = e.getTime() - s.getTime();
  if (ms <= 0) return 0;
  return Math.floor(ms / (1000 * 60 * 60 * 24 * 30.44));
}