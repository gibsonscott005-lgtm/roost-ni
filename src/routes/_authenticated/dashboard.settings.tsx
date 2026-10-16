import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  Bell,
  BellOff,
  Check,
  Info,
  KeyRound,
  Loader2,
  Mail,
  ReceiptText,
  Trash2,
  UserRound,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { DashboardShell } from "@/components/dashboard-shell";
import {
  SimulatedBillingNotice,
  TierTable,
  useBillingSnapshot,
} from "@/components/pricing-breakdown";
import { completionFeePence, formatGBP, monthlyLabel, monthlyPence } from "@/lib/pricing";
import { NOTIFICATION_TYPES, type NotificationType } from "@/lib/notifications.functions";
import { deleteAccount } from "@/lib/account.functions";
import { getEmailConfigStatus } from "@/lib/email-status.functions";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Account & notification settings — RoostNI" },
      {
        name: "description",
        content:
          "Update your RoostNI account details and password, and choose which tenancy alerts you receive.",
      },
    ],
  }),
  component: SettingsPage,
});

const GROUPS: { title: string; blurb: string; types: NotificationType[] }[] = [
  {
    title: "Applications",
    blurb: "Passport shares and landlord decisions",
    types: [
      "application_received",
      "application_accepted",
      "application_declined",
      "application_info_requested",
      "application_withdrawn",
      "application_reapplied",
    ],
  },
  {
    title: "Leases",
    blurb: "Issuing, signing and completion",
    types: [
      "lease_issued",
      "lease_signed_by_tenant",
      "lease_counter_signed",
      "property_let_agreed",
    ],
  },
  {
    title: "Rent & receipts",
    blurb: "Payments, reminders and arrears",
    types: ["receipt_logged", "receipt_confirmed", "rent_due_reminder", "rent_overdue"],
  },
  {
    title: "Deposit & inventory",
    blurb: "Statutory protection deadlines and sign-off",
    types: [
      "deposit_protected",
      "deposit_deadline_approaching",
      "inventory_submitted",
      "inventory_approved",
    ],
  },
  {
    title: "Maintenance",
    blurb: "Repair reports and progress",
    types: ["maintenance_reported", "maintenance_updated", "maintenance_resolved"],
  },
  {
    title: "Ending a tenancy",
    blurb: "Notice to Quit, final inspection and deposit settlement",
    types: [
      "notice_served",
      "notice_acknowledged",
      "final_inspection_submitted",
      "final_inspection_agreed",
      "final_inspection_disputed",
      "deposit_settlement_proposed",
      "deposit_returned",
      "tenancy_completed",
    ],
  },
  {
    title: "Safety certificates",
    blurb: "Expiry warnings for gas, electrical and energy certificates",
    types: ["certificate_expiring", "certificate_expired"],
  },
];

/**
 * A short list of urgent alerts that can also arrive by email, so nothing
 * time-critical waits for the next sign-in.
 */
const EMAIL_TYPES: NotificationType[] = [
  "lease_issued",
  "lease_signed_by_tenant",
  "lease_counter_signed",
  "application_accepted",
  "notice_served",
  "maintenance_reported",
  "rent_overdue",
  "deposit_deadline_approaching",
  "certificate_expired",
];

const LABELS: Record<NotificationType, string> = {
  application_received: "New application received",
  application_accepted: "Application accepted",
  application_declined: "Application declined",
  application_info_requested: "Landlord requested more info",
  application_withdrawn: "Applicant withdrew",
  application_reapplied: "Applicant re-applied",
  lease_issued: "Lease issued for signature",
  lease_signed_by_tenant: "Tenant signed the lease",
  lease_counter_signed: "Lease counter-signed",
  property_let_agreed: "Property marked let agreed",
  receipt_logged: "Payment receipt logged",
  receipt_confirmed: "Payment confirmed",
  rent_due_reminder: "Rent due reminder",
  rent_overdue: "Rent overdue",
  deposit_protected: "Deposit protected",
  deposit_deadline_approaching: "28-day deposit deadline approaching",
  inventory_submitted: "Inventory submitted",
  inventory_approved: "Inventory approved",
  maintenance_reported: "Maintenance reported",
  maintenance_updated: "Maintenance updated",
  notice_served: "Notice to Quit served",
  notice_acknowledged: "Notice acknowledged",
  final_inspection_submitted: "Final inspection submitted",
  final_inspection_agreed: "Final inspection agreed",
  final_inspection_disputed: "Final inspection disputed",
  deposit_settlement_proposed: "Deposit settlement proposed",
  deposit_returned: "Deposit returned",
  tenancy_completed: "Tenancy completed",
  maintenance_resolved: "Maintenance resolved",
  certificate_expiring: "Safety certificate expiring",
  certificate_expired: "Safety certificate expired",
};

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
        on ? "bg-verified" : "bg-border"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-surface shadow transition ${
          on ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </span>
  );
}

function SettingsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const deleteAccountFn = useServerFn(deleteAccount);
  const qc = useQueryClient();

  const prefsQuery = useQuery({
    enabled: !!user?.id,
    queryKey: ["notification-preferences", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("in_app_enabled, muted_types, email_enabled, email_muted_types")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const emailStatusFn = useServerFn(getEmailConfigStatus);
  const emailStatusQuery = useQuery({
    queryKey: ["email-config-status"],
    queryFn: () => emailStatusFn(),
  });

  const [enabled, setEnabled] = useState(true);
  const [muted, setMuted] = useState<NotificationType[]>([]);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [emailMuted, setEmailMuted] = useState<NotificationType[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (prefsQuery.data === undefined) return;
    setEnabled(prefsQuery.data?.in_app_enabled ?? true);
    setMuted(
      ((prefsQuery.data?.muted_types as NotificationType[] | null) ?? []) as NotificationType[],
    );
    setEmailEnabled(prefsQuery.data?.email_enabled ?? true);
    setEmailMuted(
      ((prefsQuery.data?.email_muted_types as NotificationType[] | null) ??
        []) as NotificationType[],
    );
  }, [prefsQuery.data]);

  const persist = async (
    nextEnabled: boolean,
    nextMuted: NotificationType[],
    nextEmailEnabled: boolean = emailEnabled,
    nextEmailMuted: NotificationType[] = emailMuted,
  ) => {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await supabase.from("notification_preferences").upsert(
      {
        user_id: user.id,
        in_app_enabled: nextEnabled,
        muted_types: nextMuted,
        email_enabled: nextEmailEnabled,
        email_muted_types: nextEmailMuted,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "user_id" },
    );
    setSaving(false);
    if (error) {
      toast.error("Couldn't save your preferences", { description: error.message });
      return;
    }
    await qc.invalidateQueries({ queryKey: ["notification-preferences", user.id] });
    toast.success("Notification preferences saved");
  };

  const toggleType = (t: NotificationType) => {
    const next = muted.includes(t) ? muted.filter((x) => x !== t) : [...muted, t];
    setMuted(next);
    void persist(enabled, next);
  };

  const toggleAll = () => {
    const next = !enabled;
    setEnabled(next);
    void persist(next, muted);
  };

  const toggleEmailAll = () => {
    const next = !emailEnabled;
    setEmailEnabled(next);
    void persist(enabled, muted, next, emailMuted);
  };

  const toggleEmailType = (t: NotificationType) => {
    const next = emailMuted.includes(t)
      ? emailMuted.filter((x) => x !== t)
      : [...emailMuted, t];
    setEmailMuted(next);
    void persist(enabled, muted, emailEnabled, next);
  };

  return (
    <DashboardShell user={user} profile={profile} activeKey="settings">
      <div className="mb-5">
        <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
          Account settings
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your details, change your password and choose which RoostNI alerts reach you.
        </p>
      </div>

      <AccountDetailsCard />
      <PasswordCard />
      {profile?.account_type === "landlord" ? <BillingCard /> : null}

      <h3 className="mb-3 mt-8 font-display text-lg font-semibold tracking-tight">Notifications</h3>

      {authLoading || prefsQuery.isPending ? (
        <div className="rounded-3xl border border-border bg-surface p-6 text-sm text-muted-foreground">
          Loading your preferences…
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={toggleAll}
            disabled={saving}
            aria-pressed={enabled}
            className="mb-5 flex w-full items-center justify-between gap-4 rounded-3xl border border-border bg-surface p-5 text-left transition hover:bg-secondary/40 disabled:opacity-60"
          >
            <span className="flex items-start gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-surface-muted">
                {enabled ? (
                  <Bell className="h-4 w-4 text-verified" />
                ) : (
                  <BellOff className="h-4 w-4 text-muted-foreground" />
                )}
              </span>
              <span>
                <span className="block text-sm font-semibold">In-app notifications</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {enabled
                    ? "You'll be alerted about tenancy activity as it happens."
                    : "All alerts are paused — nothing new will reach your bell."}
                </span>
              </span>
            </span>
            <Toggle on={enabled} />
          </button>

          <div className={enabled ? "" : "pointer-events-none opacity-50"}>
            {GROUPS.map((g) => (
              <section
                key={g.title}
                className="mb-5 rounded-3xl border border-border bg-surface p-5"
              >
                <h3 className="font-display text-base font-semibold tracking-tight">{g.title}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{g.blurb}</p>
                <div className="mt-4 divide-y divide-border/70">
                  {g.types.map((t) => {
                    const on = !muted.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleType(t)}
                        disabled={saving}
                        aria-pressed={on}
                        className="flex w-full items-center justify-between gap-4 py-3 text-left"
                      >
                        <span className="text-sm">{LABELS[t]}</span>
                        <Toggle on={on} />
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-verified" /> Changes save automatically.
            {NOTIFICATION_TYPES.length ? null : null}
          </p>

          <h3 className="mb-1 mt-8 font-display text-lg font-semibold tracking-tight">
            Email alerts
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Everything appears in your bell. Only these time-critical alerts are also sent to your
            email address, so a deadline never waits for your next sign-in.
          </p>

          {emailStatusQuery.isPending ? null : emailStatusQuery.data?.connected ? (
            <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-verified/30 bg-verified-soft/50 p-3 text-sm text-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-verified" />
              <span>
                Email delivery is connected. Urgent alerts will be sent to the email address on your
                account.
              </span>
            </div>
          ) : (
            <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-amber-400/40 bg-amber-100/50 p-3 text-sm text-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <span>
                Email alerts are not sending yet. In-app notifications still work, and urgent
                alerts will start arriving by email as soon as the RoostNI sending domain finishes
                verifying.
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={toggleEmailAll}
            disabled={saving}
            aria-pressed={emailEnabled}
            className="mb-5 flex w-full items-center justify-between gap-4 rounded-3xl border border-border bg-surface p-5 text-left transition hover:bg-secondary/40 disabled:opacity-60"
          >
            <span className="flex items-start gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-surface-muted">
                <Mail
                  className={`h-4 w-4 ${emailEnabled ? "text-verified" : "text-muted-foreground"}`}
                />
              </span>
              <span>
                <span className="block text-sm font-semibold">Email me urgent alerts</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {emailEnabled
                    ? "Sent to the email address on your account."
                    : "Turned off — urgent alerts will only appear in the app."}
                </span>
              </span>
            </span>
            <Toggle on={emailEnabled} />
          </button>

          <section
            className={`mb-5 rounded-3xl border border-border bg-surface p-5 ${
              emailEnabled ? "" : "pointer-events-none opacity-50"
            }`}
          >
            <h3 className="font-display text-base font-semibold tracking-tight">
              Which alerts reach your inbox
            </h3>
            <div className="mt-4 divide-y divide-border/70">
              {EMAIL_TYPES.map((t) => {
                const on = !emailMuted.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleEmailType(t)}
                    disabled={saving}
                    aria-pressed={on}
                    className="flex w-full items-center justify-between gap-4 py-3 text-left"
                  >
                    <span className="text-sm">{LABELS[t]}</span>
                    <Toggle on={on} />
                  </button>
                );
              })}
            </div>
          </section>
        </>
      )}

      <DeleteAccountCard
        onDeleted={async () => {
          await supabase.auth.signOut();
          navigate({ to: "/auth" });
        }}
      />
    </DashboardShell>
  );
}
function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        {...props}
        className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-verified/20"
      />
    </label>
  );
}

function BillingCard() {
  const { snapshot, tier, active, isPending } = useBillingSnapshot();
  const count = snapshot.propertyCount;
  const monthly = monthlyPence(tier, count);

  return (
    <section className="mb-5 rounded-3xl border border-border bg-surface p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-surface-muted">
          <ReceiptText className="h-4 w-4 text-foreground" />
        </span>
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight">
            Subscription & billing
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            A preview of the plan your portfolio sits on. Read-only — nothing is charged.
          </p>
        </div>
      </div>

      {isPending ? (
        <p className="mt-4 text-sm text-muted-foreground">Working out your plan…</p>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-surface-muted p-4">
              <p className="text-xs text-muted-foreground">Current plan</p>
              <p className="mt-1 font-display text-lg font-semibold tracking-tight">{tier.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {count} {count === 1 ? "property" : "properties"} on your account
              </p>
            </div>
            <div className="rounded-2xl bg-surface-muted p-4">
              <p className="text-xs text-muted-foreground">Monthly</p>
              <p className="mt-1 font-display text-lg font-semibold tabular-nums tracking-tight">
                {formatGBP(monthly)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{monthlyLabel(tier)}</p>
            </div>
            <div className="rounded-2xl bg-surface-muted p-4">
              <p className="text-xs text-muted-foreground">Completion fee</p>
              <p className="mt-1 font-display text-lg font-semibold tabular-nums tracking-tight">
                {formatGBP(completionFeePence(tier))}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">Once per completed tenancy</p>
            </div>
          </div>

          <TierTable tiers={snapshot.tiers} currentKey={tier.key} propertyCount={count} />

          <div className="mt-5 rounded-2xl border border-border bg-surface-muted p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Simulated invoice — this month
            </p>
            <div className="mt-2 divide-y divide-border/70">
              <div className="flex items-center justify-between py-2 text-sm">
                <span>{tier.name} subscription</span>
                <span className="tabular-nums">{formatGBP(monthly)}</span>
              </div>
              <div className="flex items-center justify-between py-2 text-sm">
                <span>Completion fees</span>
                <span className="tabular-nums">{formatGBP(0)}</span>
              </div>
              <div className="flex items-center justify-between py-2 text-sm font-semibold">
                <span>Total (not charged)</span>
                <span className="tabular-nums">{formatGBP(monthly)}</span>
              </div>
            </div>
          </div>

          <h4 className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            One-off documents & extras
          </h4>
          <div className="mt-2 divide-y divide-border/70">
            {snapshot.items.map((i) => (
              <div key={i.key} className="flex items-start justify-between gap-4 py-2">
                <span className="text-sm">
                  {i.name}
                  {i.description ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {i.description}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatGBP(i.price_pence)}
                </span>
              </div>
            ))}
          </div>

          {active ? null : <SimulatedBillingNotice className="mt-4" />}
        </>
      )}
    </section>
  );
}

function AccountDetailsCard() {
  const { user, profile, loading } = useAuth();
  const qc = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [emailSaved, setEmailSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setPhone(profile.phone ?? "");
  }, [profile?.id, profile?.full_name, profile?.phone]);

  useEffect(() => {
    setEmail(user?.email ?? "");
    setEmailSaved(false);
  }, [user?.email]);

  const save = async () => {
    if (!user?.id) return;
    if (!fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), phone: phone.trim() || null })
      .eq("id", user.id);
    setBusy(false);
    if (error) {
      toast.error("Couldn't save your details", { description: error.message });
      return;
    }
    await qc.invalidateQueries();
    toast.success("Account details updated");
  };

  const updateEmail = async () => {
    if (!user?.id) return;
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || trimmed === user.email?.toLowerCase()) {
      toast.error("Enter a new email address");
      return;
    }
    setEmailBusy(true);
    const { error } = await supabase.auth.updateUser({ email: trimmed });
    setEmailBusy(false);
    if (error) {
      toast.error("Couldn't update email", { description: error.message });
      return;
    }
    setEmailSaved(true);
    toast.success("Confirmation email sent", {
      description: "Check your new inbox and confirm the change before it takes effect.",
    });
  };

  return (
    <section className="mb-5 rounded-3xl border border-border bg-surface p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-surface-muted">
          <UserRound className="h-4 w-4 text-foreground" />
        </span>
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight">Your details</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Shown to the landlords or tenants you deal with on RoostNI.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field
          label="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jane Doe"
        />
        <Field
          label="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="028 9000 0000"
        />
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setEmailSaved(false);
          }}
          placeholder="you@example.com"
        />
        <Field
          label="Account type"
          value={
            profile?.account_type
              ? `${profile.account_type[0]?.toUpperCase()}${profile.account_type.slice(1)}`
              : ""
          }
          readOnly
          disabled
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy || loading}
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition hover:brightness-110 disabled:opacity-60"
        >
          <Check className="h-3.5 w-3.5" /> {busy ? "Saving…" : "Save details"}
        </button>
        <button
          type="button"
          onClick={() => void updateEmail()}
          disabled={emailBusy || loading || email.trim().toLowerCase() === (user?.email ?? "").toLowerCase()}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-4 py-2 text-xs font-semibold transition hover:bg-secondary/60 disabled:opacity-60"
        >
          <Mail className="h-3.5 w-3.5" /> {emailBusy ? "Sending…" : emailSaved ? "Confirmation sent" : "Update email"}
        </button>
      </div>
    </section>
  );
}

function PasswordCard() {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const change = async () => {
    if (pw.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (pw !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      toast.error("Couldn't update your password", { description: error.message });
      return;
    }
    setPw("");
    setConfirm("");
    toast.success("Password updated");
  };

  return (
    <section className="mb-5 rounded-3xl border border-border bg-surface p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-surface-muted">
          <KeyRound className="h-4 w-4 text-foreground" />
        </span>
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight">Password</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Use at least 8 characters. You'll stay signed in on this device.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field
          label="New password"
          type="password"
          value={pw}
          autoComplete="new-password"
          onChange={(e) => setPw(e.target.value)}
        />
        <Field
          label="Confirm new password"
          type="password"
          value={confirm}
          autoComplete="new-password"
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      <button
        type="button"
        onClick={() => void change()}
        disabled={busy}
        className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-4 py-2 text-xs font-semibold transition hover:bg-secondary/60 disabled:opacity-60"
      >
        <KeyRound className="h-3.5 w-3.5" /> {busy ? "Updating…" : "Update password"}
      </button>
    </section>
  );
}

function DeleteAccountCard({ onDeleted }: { onDeleted: () => Promise<void> }) {
  const { user } = useAuth();
  const deleteAccountFn = useServerFn(deleteAccount);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const expected = "delete my account";
  const canDelete = confirmText.toLowerCase() === expected;

  const destroy = async () => {
    if (!user?.id || !canDelete) return;
    setBusy(true);
    try {
      await deleteAccountFn();
      toast.success("Account deleted");
      await onDeleted();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Please try again.";
      toast.error("Could not delete account", { description: message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-5 rounded-3xl border border-red-100 bg-red-50/50 p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-red-100">
          <Trash2 className="h-4 w-4 text-red-700" />
        </span>
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight text-red-800">
            Delete account
          </h3>
          <p className="mt-0.5 text-xs text-red-700/80">
            This permanently removes your RoostNI account, passport data, listings and tenancy records.
            It cannot be undone.
          </p>
        </div>
      </div>
      <div className="mt-4">
        <label className="block">
          <span className="text-xs font-medium text-red-800">
            Type "<strong>{expected}</strong>" to confirm
          </span>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="delete my account"
            className="mt-1 h-10 w-full rounded-xl border border-red-200 bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground/80 focus:outline-none focus:ring-2 focus:ring-red-300"
          />
        </label>
        <button
          type="button"
          onClick={() => void destroy()}
          disabled={busy || !canDelete}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" />
          )}
          {busy ? "Deleting…" : "Delete my account"}
        </button>
      </div>
    </section>
  );
}
