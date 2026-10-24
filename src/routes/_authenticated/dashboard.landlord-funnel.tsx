import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ArrowRight, HandHelping, Loader2, RefreshCw, Shield } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { getLandlordFunnel, type LandlordFunnelReport } from "@/lib/landlord-funnel.functions";
import { STEP_LABELS, STUCK_AFTER_DAYS } from "@/lib/landlord-funnel";

export const Route = createFileRoute("/_authenticated/dashboard/landlord-funnel")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Landlord funnel — RoostNI" },
      { name: "description", content: "Where landlords drop off between signing up and publishing a listing." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LandlordFunnelPage,
});

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

function LandlordFunnelPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const fetchFunnel = useServerFn(getLandlordFunnel);
  const [data, setData] = useState<LandlordFunnelReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = profile?.account_type === "admin";

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchFunnel());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the funnel");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isAdmin) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAdmin]);

  if (!authLoading && !isAdmin) {
    return (
      <DashboardShell user={user} profile={profile} activeKey="admin">
        <div className="rounded-sm border border-border bg-surface p-8 text-center">
          <Shield className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-4 font-display text-lg font-semibold">Admin access only</h2>
          <Link to="/dashboard" className="mt-4 inline-block text-sm underline">
            Back to dashboard
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const max = Math.max(1, data?.steps[0]?.count ?? 1);

  return (
    <DashboardShell user={user} profile={profile} activeKey="admin">
      <div className="space-y-6">
        <div className="border-2 border-border bg-surface p-6 shadow-raised sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <Link to="/dashboard/admin" className="text-xs text-muted-foreground underline-offset-2 hover:underline">
                ← Command centre
              </Link>
              <h1 className="mt-1 font-display text-xl font-semibold tracking-tight sm:text-2xl">Landlord funnel</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                From sign-up to a published listing. Test and admin accounts are left out.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
          {data ? (
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-surface-muted px-3 py-1 font-semibold">{data.landlords.length} landlords</span>
              <span className="rounded-full bg-destructive/10 px-3 py-1 font-semibold text-destructive">
                {data.stuck} stuck {STUCK_AFTER_DAYS}+ days
              </span>
              <span className="rounded-full bg-verified/10 px-3 py-1 font-semibold text-verified">
                {data.helpRequests} asked for help
              </span>
            </div>
          ) : null}
        </div>

        {loading && !data ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <p className="rounded-sm border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>
        ) : data ? (
          <>
            <section className="border-2 border-border bg-surface p-5 sm:p-6">
              <h2 className="font-display text-base font-semibold">Steps</h2>
              <ol className="mt-4 space-y-3">
                {data.steps.map((s, i) => (
                  <li key={s.step}>
                    {s.dropOffPct !== null ? (
                      <p className="mb-1 flex items-center gap-1 pl-1 text-[11px] text-muted-foreground">
                        <ArrowRight className="h-3 w-3 rotate-90" /> {s.dropOffPct}% dropped off
                      </p>
                    ) : null}
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-xs font-semibold text-muted-foreground">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{s.label}</span>
                          <span className="font-semibold">{s.count}</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-muted">
                          <div className="h-full bg-verified" style={{ width: `${(s.count / max) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section className="border-2 border-border bg-surface">
              <h2 className="border-b border-border p-5 font-display text-base font-semibold">Landlord accounts</h2>
              {data.landlords.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">No landlord accounts yet.</p>
              ) : (
                <ul>
                  {data.landlords.map((l) => (
                    <li key={l.userId} className="border-t border-border p-4 first:border-t-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium">{l.name || "No name given"}</p>
                          {l.email ? (
                            <a href={`mailto:${l.email}`} className="break-all text-xs text-verified underline-offset-2 hover:underline">
                              {l.email}
                            </a>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {l.helpRequested ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-verified px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-verified-foreground)]">
                              <HandHelping className="h-3 w-3" /> Help requested {day(l.helpRequestedAt)}
                            </span>
                          ) : null}
                          {l.stuck ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-[11px] font-semibold text-destructive">
                              <AlertTriangle className="h-3 w-3" /> Stuck {STUCK_AFTER_DAYS}+ days
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Furthest step: <span className="font-semibold text-foreground">{l.furthestStep ? STEP_LABELS[l.furthestStep] : "—"}</span>
                        {" · "}Last active {day(l.lastActivity)} · Signed up {day(l.signedUpAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </div>
    </DashboardShell>
  );
}
