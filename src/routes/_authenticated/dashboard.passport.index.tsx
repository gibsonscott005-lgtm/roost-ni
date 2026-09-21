import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Banknote,
  BadgeCheck,
  Check,
  IdCard,
  Loader2,
  Pencil,
  Share2,
  UserRoundCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { DocumentRow, formatEmployment } from "@/components/passport-bits";

export const Route = createFileRoute("/_authenticated/dashboard/passport/")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "My Passport — RoostNI" },
      {
        name: "description",
        content: "Your self-certified tenant passport: identity, income and references in one place.",
      },
    ],
  }),
  component: MyPassportPage,
});

type PassportRow = {
  identity_verified: boolean;
  income_verified: boolean;
  reference_verified: boolean;
  id_status: string | null;
  employment_status: string | null;
  monthly_income_net: number | null;
  annual_income: number | null;
  id_document_type: string | null;
  id_document_path: string | null;
  income_document_path: string | null;
  previous_landlord_name: string | null;
  previous_landlord_email: string | null;
  previous_landlord_phone: string | null;
  tenancy_duration: string | null;
  reference_document_path: string | null;
  is_first_time_renter: boolean | null;
  guarantor_name: string | null;
  previous_landlord_name_2: string | null;
};

function MyPassportPage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [passport, setPassport] = useState<PassportRow | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("tenant_passports")
          .select(
            "identity_verified, income_verified, reference_verified, id_status, employment_status, monthly_income_net, annual_income, id_document_type, id_document_path, income_document_path, previous_landlord_name, previous_landlord_email, previous_landlord_phone, tenancy_duration, reference_document_path, is_first_time_renter, guarantor_name, previous_landlord_name_2",
          )
          .eq("user_id", user.id)
          .maybeSingle();
        if (cancelled) return;
        if (error) throw error;
        setPassport(data as PassportRow);
        setLoading(false);
      } catch (err: unknown) {
        const e = err as { code?: string; message?: string };
        const msg = e?.message || "Please refresh.";
        toast.error("Couldn't load passport", {
          description: e?.code ? `[${e.code}] ${msg}` : msg,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading]);

  const steps = [
    {
      key: "identity",
      done:
        !!passport?.identity_verified ||
        (!!passport?.id_document_path && !!passport?.id_document_type),
    },
    {
      key: "income",
      done:
        !!passport?.income_verified ||
        (!!passport?.employment_status &&
          !!passport?.annual_income &&
          !!passport?.income_document_path),
    },
    {
      key: "references",
      done:
        !!passport?.reference_verified ||
        (passport?.is_first_time_renter
          ? !!passport?.guarantor_name
          : !!passport?.previous_landlord_name),
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const isComplete = doneCount === 3;

  const shareLink = async () => {
    if (!user) return;
    const url = `${window.location.origin}/passport/${user.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Passport link copied", {
        description: "Share it with a landlord to instantly verify your badges.",
      });
    } catch {
      toast.error("Could not copy link", { description: url });
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardShell user={user} profile={profile} activeKey="passport">
        <div className="rounded-3xl border border-border bg-surface p-10 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          <p className="mt-2">Loading your passport…</p>
        </div>
      </DashboardShell>
    );
  }

  if (!isComplete) {
    const pct = Math.round((doneCount / 3) * 100);
    return (
      <DashboardShell user={user} profile={profile} activeKey="passport">
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-floating sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            My passport
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold tracking-tight sm:text-2xl">
            {doneCount === 0 ? "Start your tenant passport" : "Finish your tenant passport"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {doneCount} of 3 steps complete. Documents you upload are shared securely with landlords
            when you apply — RoostNI does not run background checks.
          </p>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-verified transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate({ to: "/dashboard/passport/edit" })}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] transition hover:bg-foreground/92"
            >
              {doneCount === 0 ? "Build my passport" : "Continue passport"}
            </button>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-secondary"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </DashboardShell>
    );
  }

  const employmentLabel = formatEmployment(passport?.employment_status);
  const monthlyNet = passport?.monthly_income_net ?? null;
  const referencesSubLabel = (() => {
    if (passport?.is_first_time_renter && passport?.guarantor_name) return "Guarantor Provided";
    if (passport?.previous_landlord_name_2) return "2 Landlord References";
    if (passport?.previous_landlord_name) return "1 Landlord Reference";
    return "Self-Certified";
  })();
  const badges: { label: string; icon: typeof IdCard; sub?: string }[] = [
    {
      label: "Identity",
      icon: IdCard,
      sub: passport?.id_status === "verified" ? "Verified" : "Self-Certified",
    },
    { label: "Income", icon: Banknote },
    { label: "References", icon: UserRoundCheck, sub: referencesSubLabel },
  ];

  return (
    <DashboardShell user={user} profile={profile} activeKey="passport">
      <div className="rounded-3xl border border-border bg-surface p-6 shadow-floating sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              My passport
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold tracking-tight sm:text-2xl">
              {profile?.full_name || "Your tenant passport"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Documents have been securely uploaded by the tenant. Landlords can review these files
              directly upon application.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-verified px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-verified-foreground)]">
            <BadgeCheck className="h-3.5 w-3.5" />
            Profile Complete • Self-Certified
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {badges.map((b) => (
            <div
              key={b.label}
              className="flex items-center gap-2 rounded-2xl border border-verified/30 bg-verified-soft/50 px-3 py-2.5"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-verified text-[var(--color-verified-foreground)]">
                <b.icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-xs font-semibold tracking-tight text-foreground">
                  {b.label}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-verified">
                  {b.sub ?? "Self-Certified"}
                </p>
              </div>
            </div>
          ))}
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-2 rounded-2xl border border-border bg-surface-muted/60 p-4 sm:grid-cols-2">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Employment
            </dt>
            <dd className="mt-0.5 font-display text-sm font-semibold tracking-tight text-foreground">
              {employmentLabel}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Monthly net income
            </dt>
            <dd className="mt-0.5 font-display text-sm font-semibold tracking-tight text-foreground">
              {monthlyNet ? `£${Number(monthlyNet).toLocaleString()}` : "—"}
            </dd>
          </div>
        </dl>

        <div className="mt-3 rounded-2xl border border-border bg-surface-muted/60 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Documents on file
          </p>
          <ul className="mt-2 space-y-2">
            <DocumentRow label="Identity document" path={passport?.id_document_path ?? null} stepHash="identity" />
            <DocumentRow label="Income document" path={passport?.income_document_path ?? null} stepHash="income" />
            <DocumentRow
              label="Reference letter"
              path={passport?.reference_document_path ?? null}
              stepHash="references"
              optional
              sectionFilled={!!passport?.previous_landlord_name || !!passport?.guarantor_name}
            />
          </ul>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={shareLink}
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] transition hover:bg-foreground/92"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share passport
          </button>
          <Link
            to="/dashboard/passport/edit"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-secondary"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit passport
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-secondary"
          >
            <Check className="h-3.5 w-3.5" />
            Back to dashboard
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}