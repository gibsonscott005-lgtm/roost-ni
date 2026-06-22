import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Banknote,
  Check,
  FileUp,
  IdCard,
  Loader2,
  Lock,
  UserRoundCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/dashboard-shell";

export const Route = createFileRoute("/_authenticated/dashboard/passport/edit")({
  head: () => ({
    meta: [
      { title: "Edit Tenant Passport — Roost NI" },
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

type StepKey = "identity" | "income" | "references";

interface Passport {
  user_id: string;
  identity_verified: boolean;
  income_verified: boolean;
  reference_verified: boolean;
  right_to_rent_verified: boolean;
  monthly_income_net: number | null;
  id_document_type: string | null;
  id_document_number: string | null;
  id_document_path: string | null;
  employment_status: string | null;
  annual_income: number | null;
  income_document_path: string | null;
  previous_landlord_name: string | null;
  previous_landlord_email: string | null;
  previous_landlord_phone: string | null;
}

const STEPS: { key: StepKey; label: string; sub: string }[] = [
  { key: "identity", label: "Identity & Right to Rent", sub: "Step 1" },
  { key: "income", label: "Income verification", sub: "Step 2" },
  { key: "references", label: "Character references", sub: "Step 3" },
];

function PassportEditPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [passport, setPassport] = useState<Passport | null>(null);
  const [loading, setLoading] = useState(true);

  const isTenant = !profile || profile.account_type === "tenant";

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("tenant_passports")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!data) {
      const { data: inserted } = await supabase
        .from("tenant_passports")
        .insert({ user_id: user.id })
        .select("*")
        .single();
      setPassport(inserted as Passport);
    } else {
      setPassport(data as Passport);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
                uploaded documents are shared securely with landlords when you apply. Roost does
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
            Documents stored privately. Shared securely with landlords when you apply — Roost does
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
  const flags = [
    !!passport?.identity_verified,
    !!passport?.income_verified,
    !!passport?.reference_verified,
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
    <section className="rounded-3xl border border-border bg-surface p-5 shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_48px_-32px_rgba(15,23,42,0.18)] sm:p-7">
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
  "mt-1.5 block h-11 w-full rounded-xl border border-border bg-surface-muted px-3.5 text-sm text-foreground placeholder:text-muted-foreground/80 transition focus:border-verified/40 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-verified/20";

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

async function uploadDoc(userId: string, folder: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${userId}/${folder}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
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
        className="inline-flex items-center gap-1.5 rounded-full bg-verified px-5 py-2.5 text-sm font-semibold text-[var(--color-verified-foreground)] shadow-[0_12px_28px_-12px_rgba(16,185,129,0.55)] transition hover:brightness-95 disabled:opacity-70"
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
      const { data, error } = await supabase
        .from("tenant_passports")
        .update({
          id_document_type: docType,
          id_document_number: docNumber,
          id_document_path: path,
          identity_verified: true,
          right_to_rent_verified: true,
        })
        .eq("user_id", user.id)
        .select("*")
        .single();
      if (error) throw error;
      toast.success("Identity saved", {
        description: "Right to Rent step complete.",
      });
      onSaved(data as Passport);
    } catch (err: unknown) {
      toast.error("Could not save", {
        description: err instanceof Error ? err.message : "Please try again.",
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
        title="Identity & Right to Rent"
        desc="Upload your government photo ID. This self-certifies Identity and Right to Rent on your passport — landlords review the document when you apply."
      >
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
  const [annual, setAnnual] = useState(
    passport.annual_income ? String(passport.annual_income) : "",
  );
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || saving) return;
    const annualNum = Number(annual);
    if (!annualNum || annualNum <= 0) {
      toast.error("Enter your annual income");
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
        .update({
          employment_status: status,
          annual_income: annualNum,
          monthly_income_net: Math.round((annualNum / 12) * 100) / 100,
          income_document_path: path,
          income_verified: true,
        })
        .eq("user_id", user.id)
        .select("*")
        .single();
      if (error) throw error;
      toast.success("Income saved");
      onSaved(data as Passport);
    } catch (err: unknown) {
      toast.error("Could not save", {
        description: err instanceof Error ? err.message : "Please try again.",
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
        desc="Tell us about your employment and upload a recent payslip or tax summary."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            </select>
          </Field>
          <Field label="Annual income (£, gross)">
            <input
              required
              inputMode="numeric"
              value={annual}
              onChange={(e) => setAnnual(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="34000"
              className={inputCx}
            />
          </Field>
        </div>
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
  const [name, setName] = useState(passport.previous_landlord_name ?? "");
  const [email, setEmail] = useState(passport.previous_landlord_email ?? "");
  const [phone, setPhone] = useState(passport.previous_landlord_phone ?? "");
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || saving) return;
    if (!name.trim() || !email.trim() || !phone.trim()) {
      toast.error("Please complete every field");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("tenant_passports")
        .update({
          previous_landlord_name: name.trim(),
          previous_landlord_email: email.trim(),
          previous_landlord_phone: phone.trim(),
          reference_verified: true,
        })
        .eq("user_id", user.id)
        .select("*")
        .single();
      if (error) throw error;
      onSaved(data as Passport);
    } catch (err: unknown) {
      toast.error("Could not save", {
        description: err instanceof Error ? err.message : "Please try again.",
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
        desc="Provide a previous landlord we can contact to confirm your tenancy history."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Previous landlord's full name" className="sm:col-span-2">
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
        </div>
        <StepActions onBack={onBack} saving={saving} submitLabel="Save & finish" />
      </StepCard>
    </form>
  );
}