import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { Check, Loader2, MessageSquare, Shield, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Roost NI" },
      { name: "description", content: "Beta feedback and platform oversight." },
    ],
  }),
  component: AdminDashboard,
});

type FeedbackRow = {
  id: string;
  created_at: string;
  category: string;
  message: string;
  status: string;
  page_path: string | null;
  account_type: string | null;
  user_id: string;
};

function AdminDashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FeedbackRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isAdmin = profile?.account_type === "admin";

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("beta_feedback")
      .select("id, created_at, category, message, status, page_path, account_type, user_id")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast.error("Couldn't load feedback", { description: error.message });
      setLoading(false);
      return;
    }
    const rows = (data as FeedbackRow[] | null) ?? [];
    setItems(rows);
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  const updateStatus = async (id: string, status: string) => {
    setBusyId(id);
    const { error } = await supabase.from("beta_feedback").update({ status }).eq("id", id);
    if (error) {
      toast.error("Couldn't update status", { description: error.message });
    } else {
      setItems((rows) => rows.map((r) => (r.id === id ? { ...r, status } : r)));
      toast.success("Feedback updated");
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

  const openCount = items.filter((i) => i.status === "open").length;

  return (
    <DashboardShell user={user} profile={profile} activeKey="admin">
      <div className="rounded-3xl border border-border bg-surface p-6 shadow-resting sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Beta oversight
            </p>
            <h1 className="mt-1 font-display text-xl font-semibold tracking-tight sm:text-2xl">
              Feedback & reports
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-verified px-2.5 py-1 text-[10px] font-semibold text-[var(--color-verified-foreground)]">
              {items.length} total
            </span>
            {openCount > 0 ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-800">
                {openCount} open
              </span>
            ) : null}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface-muted/40 p-6 text-center">
            <MessageSquare className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">No beta feedback yet.</p>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {items.map((item) => (
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
                      <span>{new Date(item.created_at).toLocaleString("en-GB")}</span>
                      {item.email ? <span>{item.email}</span> : null}
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
        )}
      </div>
    </DashboardShell>
  );
}
