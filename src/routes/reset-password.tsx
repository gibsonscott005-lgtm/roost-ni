import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LogoMark } from "@/components/logo";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  staticData: { sitemap: false },
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password — RoostNI" },
      {
        name: "description",
        content: "Choose a new password for your RoostNI tenant or landlord account.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "ready" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let settled = false;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        settled = true;
        setStatus("ready");
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        settled = true;
        setStatus("ready");
      }
    });

    // Give Supabase a moment to exchange the recovery link for a session.
    const timer = window.setTimeout(() => {
      if (!settled) setStatus("invalid");
    }, 2500);

    return () => {
      window.clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  const mismatch = confirm.length > 0 && password !== confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || mismatch || password.length < 6) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated", { description: "You're signed in with your new password." });
      void navigate({ to: "/dashboard" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Couldn't update your password", { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  const inputCx =
    "h-11 w-full rounded-xl border border-border bg-surface shadow-resting px-3.5 text-sm text-foreground placeholder:text-muted-foreground/80 transition focus:border-verified/40 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-verified/20";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70 bg-surface/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center px-4 sm:px-6">
          <Link to="/auth" className="flex items-center gap-2">
            <LogoMark />
            <span className="font-display text-base font-semibold tracking-tight">
              Roost<span className="text-verified">NI</span>
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-col px-4 pb-16 pt-10 sm:px-6">
        <div className="mb-6 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Password reset</p>
          <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight sm:text-3xl">Set a new password</h1>
        </div>

        <section className="rounded-3xl border border-border bg-surface p-5 shadow-floating sm:p-7">
          {status === "checking" ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking your reset link…
            </div>
          ) : status === "invalid" ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-surface-muted p-4 text-sm">
                <p className="font-medium text-foreground">This reset link has expired</p>
                <p className="mt-1 text-muted-foreground">
                  Reset links can only be used once and expire after a short while. Request a fresh one to continue.
                </p>
              </div>
              <Link
                to="/auth"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3.5 font-display text-sm font-semibold text-[var(--color-primary-foreground)] transition hover:bg-foreground/92"
              >
                Request a new link
              </Link>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="text-sm font-medium text-foreground">New password</span>
                <div className="relative mt-1.5">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
                    className={`${inputCx} pl-9`}
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-foreground">Confirm new password</span>
                <div className="relative mt-1.5">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    required
                    minLength={6}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    type="password"
                    autoComplete="new-password"
                    placeholder="Re-enter your new password"
                    className={`${inputCx} pl-9`}
                  />
                </div>
                {mismatch ? (
                  <p className="mt-1.5 text-xs text-destructive">Both passwords must match.</p>
                ) : null}
              </label>

              <button
                type="submit"
                disabled={submitting || mismatch}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3.5 font-display text-sm font-semibold text-[var(--color-primary-foreground)] shadow-raised transition hover:bg-foreground/92 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Please wait…" : "Update password"}
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}