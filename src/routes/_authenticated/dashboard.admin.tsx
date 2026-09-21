import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/dashboard-shell";
import {
  getAdminOverview,
  setFeedbackStatus,
  type AdminOverview,
} from "@/lib/admin-overview.functions";
import {
  BarChart3,
  Check,
  ClipboardCheck,
  ExternalLink,
  Loader2,
  MessageSquare,
  RefreshCw,
  Shield,
  Users,
  X,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/admin")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Command centre — RoostNI" },
      {
        name: "description",
        content: "Beta sign-ups, compliance audits, property activity and feedback for RoostNI.",
      },
    ],
  }),
  component: AdminDashboard,
});

const dateFmt = (iso: string) => new Date(iso).toLocaleString("en-GB");

function AdminDashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const fetchOverview = useServerFn(getAdminOverview);
  const updateStatusFn = useServerFn(setFeedbackStatus);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdminOverview | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<"signups" | "audits" | "feedback">("signups");

  const isAdmin = profile?.account_type === "admin";

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      setData(await fetchOverview({ data: undefined } as never));
    } catch (error) {
      toast.error("Couldn't load the command centre", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading || !isAdmin) {
      if (!authLoading) setLoading(false);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading, isAdmin]);

  const updateStatus = async (id: string, status: "open" | "resolved" | "closed") => {
    setBusyId(id);
    try {
      await updateStatusFn({ data: { id, status } });
      setData((prev) =>
        prev
          ? {
              ...prev,
              feedback: prev.feedback.map((f) => (f.id === id ? { ...f, status } : f)),
              totals: {
                ...prev.totals,
                openFeedback:
                  prev.feedback.filter((f) => (f.id === id ? status === "open" : f.status === "open"))
                    .length,
              },
            }
          : prev,
      );
      toast.success("Feedback updated");
    } catch (error) {
      toast.error("Couldn't update status", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
    setBusyId(null);
  };

  if (authLoading || loading) {
    return (
      <DashboardShell user={user} profile={profile} activeKey="admin">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardShell>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardShell user={user} profile={profile} activeKey="admin">
        <div className="rounded-3xl border border-border bg-surface p-8 text-center">
          <Shield className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-4 font-display text-lg font-semibold">Admin access only</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This area is restricted to admin accounts.
          </p>
          <Link
            to="/dashboard"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-[var(--color-primary-foreground)]"
          >
            Back to dashboard
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const t = data?.totals;

  return (
    <DashboardShell user={user} profile={profile} activeKey="admin">
      <div className="space-y-6">
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-resting sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Free early beta
              </p>
              <h1 className="mt-1 font-display text-xl font-semibold tracking-tight sm:text-2xl">
                Command centre
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Everything happening inside RoostNI, in one place.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => load(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
              <a
                href="https://eu.posthog.com"
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-[var(--color-primary-foreground)] transition hover:bg-foreground/90"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Visitor traffic
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Stat label="Landlords" value={t?.landlords ?? 0} />
            <Stat label="Tenants" value={t?.tenants ?? 0} />
            <Stat label="New (7 days)" value={t?.signUpsLast7Days ?? 0} />
            <Stat label="Passports started" value={t?.passports ?? 0} />
            <Stat label="Audits completed" value={t?.audits ?? 0} />
            <Stat
              label="Average audit score"
              value={t?.averageScore === null || t === undefined ? "—" : `${t.averageScore}%`}
            />
            <Stat label="Live listings" value={t?.listingsLive ?? 0} />
            <Stat label="Tenanted (off market)" value={t?.listingsTenanted ?? 0} />
            <Stat label="Vacant, not advertised" value={t?.listingsVacant ?? 0} />
            <Stat label="Applications" value={t?.applications ?? 0} />
            <Stat label="Audits with email" value={t?.auditsWithEmail ?? 0} />
            <Stat label="Open feedback" value={t?.openFeedback ?? 0} />
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-surface p-6 shadow-resting sm:p-8">
          <div className="flex flex-wrap gap-2">
            <TabButton
              active={tab === "signups"}
              onClick={() => setTab("signups")}
              icon={Users}
              label={`Sign-ups (${data?.signUps.length ?? 0})`}
            />
            <TabButton
              active={tab === "audits"}
              onClick={() => setTab("audits")}
              icon={ClipboardCheck}
              label={`Audits (${data?.audits.length ?? 0})`}
            />
            <TabButton
              active={tab === "feedback"}
              onClick={() => setTab("feedback")}
              icon={MessageSquare}
              label={`Feedback (${data?.feedback.length ?? 0})`}
            />
          </div>

          {tab === "signups" ? (
            data && data.signUps.length > 0 ? (
              <ul className="mt-6 space-y-3">
                {data.signUps.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-surface-muted/50 p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {s.full_name || "(no name given)"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{s.email ?? "—"}</p>
                      {s.hear_about_us ? (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Heard about us: {s.hear_about_us}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground">
                        {s.account_type}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {dateFmt(s.created_at)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty icon={Users} text="No sign-ups yet." />
            )
          ) : null}

          {tab === "audits" ? (
            data && data.audits.length > 0 ? (
              <ul className="mt-6 space-y-3">
                {data.audits.map((a) => (
                  <li key={a.id} className="rounded-2xl border border-border bg-surface-muted/50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {a.score}% · {a.band}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {a.contact_name ? `${a.contact_name} · ` : ""}
                          {a.email ?? "anonymous"}
                          {a.property_count ? ` · ${a.property_count} properties` : ""}
                        </p>
                        {a.gaps.length > 0 ? (
                          <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[11px] text-muted-foreground">
                            {a.gaps.slice(0, 4).map((gap, i) => (
                              <li key={i}>{gap}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {dateFmt(a.created_at)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty icon={ClipboardCheck} text="No audits completed yet." />
            )
          ) : null}

          {tab === "feedback" ? (
            data && data.feedback.length > 0 ? (
              <ul className="mt-6 space-y-3">
                {data.feedback.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-2xl border border-border bg-surface-muted/50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground">
                            {item.category}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                              item.status === "open"
                                ? "bg-amber-100 text-amber-800"
                                : item.status === "resolved"
                                  ? "bg-verified text-[var(--color-verified-foreground)]"
                                  : "bg-surface-muted text-muted-foreground"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                          {item.message}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          <span>{dateFmt(item.created_at)}</span>
                          {item.author ? <span>{item.author}</span> : null}
                          {item.account_type ? (
                            <span className="rounded bg-surface px-1 py-0.5 text-[10px] uppercase">
                              {item.account_type}
                            </span>
                          ) : null}
                          {item.page_path ? <span>{item.page_path}</span> : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {item.status !== "resolved" ? (
                          <button
                            type="button"
                            onClick={() => updateStatus(item.id, "resolved")}
                            disabled={busyId === item.id}
                            className="inline-flex items-center gap-1 rounded-full bg-verified px-2.5 py-1 text-[11px] font-semibold text-[var(--color-verified-foreground)] transition hover:brightness-95 disabled:opacity-60"
                          >
                            {busyId === item.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                            Resolve
                          </button>
                        ) : null}
                        {item.status !== "open" ? (
                          <button
                            type="button"
                            onClick={() => updateStatus(item.id, "open")}
                            disabled={busyId === item.id}
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-foreground transition hover:bg-secondary disabled:opacity-60"
                          >
                            Re-open
                          </button>
                        ) : null}
                        {item.status !== "closed" ? (
                          <button
                            type="button"
                            onClick={() => updateStatus(item.id, "closed")}
                            disabled={busyId === item.id}
                            title="Close without resolving"
                            className="inline-flex items-center rounded-full border border-border bg-surface p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-60"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty icon={MessageSquare} text="No beta feedback yet." />
            )
          ) : null}
        </div>
      </div>
    </DashboardShell>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-muted/50 p-4">
      <p className="font-display text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "bg-foreground text-[var(--color-primary-foreground)]"
          : "border border-border bg-surface text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function Empty({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface-muted/40 p-6 text-center">
      <Icon className="mx-auto h-6 w-6 text-muted-foreground" />
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
