import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, BellOff, Check, KeyRound, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { NOTIFICATION_TYPES, type NotificationType } from "@/lib/notifications.functions";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  head: () => ({
    meta: [
      { title: "Account & notification settings — Roost NI" },
      {
        name: "description",
        content:
          "Update your Roost account details and password, and choose which tenancy alerts you receive.",
      },
    ],
  }),
  component: SettingsPage,
});

const GROUPS: { title: string; blurb: string; types: NotificationType[] }[] = [
  {
    title: "Applications",
    blurb: "Passport shares and landlord decisions",
    types: ["application_received", "application_accepted", "application_declined"],
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
];

const LABELS: Record<NotificationType, string> = {
  application_received: "New application received",
  application_accepted: "Application accepted",
  application_declined: "Application declined",
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
  maintenance_resolved: "Maintenance resolved",
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
  const qc = useQueryClient();

  const prefsQuery = useQuery({
    enabled: !!user?.id,
    queryKey: ["notification-preferences", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("in_app_enabled, muted_types")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [enabled, setEnabled] = useState(true);
  const [muted, setMuted] = useState<NotificationType[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (prefsQuery.data === undefined) return;
    setEnabled(prefsQuery.data?.in_app_enabled ?? true);
    setMuted(((prefsQuery.data?.muted_types as NotificationType[] | null) ?? []) as NotificationType[]);
  }, [prefsQuery.data]);

  const persist = async (nextEnabled: boolean, nextMuted: NotificationType[]) => {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from("notification_preferences")
      .upsert(
        {
          user_id: user.id,
          in_app_enabled: nextEnabled,
          muted_types: nextMuted,
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

  return (
    <DashboardShell user={user} profile={profile} activeKey="settings">
      <div className="mb-5">
        <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
          Notification settings
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose which Roost alerts appear in your notification bell.
        </p>
      </div>

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
              <section key={g.title} className="mb-5 rounded-3xl border border-border bg-surface p-5">
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
        </>
      )}
    </DashboardShell>
  );
}