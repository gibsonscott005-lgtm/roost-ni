import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Home, Mail, Lock, UserRound, ShieldCheck, Building2, IdCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or sign up — Roost NI" },
      {
        name: "description",
        content:
          "Create a verified Tenant or Landlord account on Roost NI. Email sign-up for renters and property owners in Northern Ireland.",
      },
    ],
  }),
  component: AuthPage,
});

type Role = "tenant" | "landlord";
type Mode = "signup" | "login";

function AuthPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("tenant");
  const [mode, setMode] = useState<Mode>("signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName, account_type: role },
          },
        });
        if (error) throw error;
        toast.success("Account created", {
          description:
            role === "landlord"
              ? "Welcome to Roost. Your landlord dashboard is ready."
              : "Welcome to Roost. Your tenant passport is being prepared.",
        });
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
        navigate({ to: "/dashboard" });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(mode === "signup" ? "Sign-up failed" : "Sign-in failed", {
        description: message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const inputCx =
    "h-11 w-full rounded-xl border border-border bg-surface-muted px-3.5 text-sm text-foreground placeholder:text-muted-foreground/80 transition focus:border-verified/40 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-verified/20";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70 bg-surface/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-foreground text-[var(--color-primary-foreground)]">
              <Home className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <span className="font-display text-base font-semibold tracking-tight">
              Roost<span className="text-verified">.</span>ni
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-col px-4 pb-16 pt-10 sm:px-6">
        <div className="mb-6 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </p>
          <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {mode === "signup" ? "Join Roost NI" : "Sign in to Roost"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signup"
              ? "Verified passports for renters. Compliant listings for landlords."
              : "Continue to your passport or property dashboard."}
          </p>
        </div>

        <section className="rounded-3xl border border-border bg-surface p-5 shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_48px_-32px_rgba(15,23,42,0.18)] sm:p-7">
          <div
            role="tablist"
            aria-label="Account type"
            className="grid grid-cols-2 gap-1 rounded-full border border-border bg-surface-muted p-1"
          >
            {(
              [
                { v: "tenant", label: "I am a Tenant", Icon: IdCard },
                { v: "landlord", label: "I am a Landlord", Icon: Building2 },
              ] as const
            ).map(({ v, label, Icon }) => {
              const active = role === v;
              return (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setRole(v)}
                  className={`flex items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition sm:text-sm ${
                    active
                      ? "bg-surface text-foreground shadow-[0_1px_0_rgba(15,23,42,0.04),0_8px_20px_-12px_rgba(15,23,42,0.25)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </div>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            {mode === "signup" ? (
              <label className="block">
                <span className="text-sm font-medium text-foreground">Full name</span>
                <div className="relative mt-1.5">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    type="text"
                    autoComplete="name"
                    placeholder="James Stewart"
                    className={`${inputCx} pl-9`}
                  />
                </div>
              </label>
            ) : null}

            <label className="block">
              <span className="text-sm font-medium text-foreground">Email address</span>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={`${inputCx} pl-9`}
                />
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-foreground">Password</span>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  placeholder="At least 6 characters"
                  className={`${inputCx} pl-9`}
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3.5 font-display text-sm font-semibold text-[var(--color-primary-foreground)] shadow-[0_12px_28px_-12px_rgba(15,23,42,0.45)] transition hover:translate-y-[-1px] hover:bg-foreground/92 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Please wait…"
                : mode === "signup"
                  ? role === "landlord"
                    ? "Create Landlord Account"
                    : "Create Tenant Account"
                  : "Sign in"}
            </button>
          </form>

          <div className="mt-4 flex items-center gap-2 rounded-xl bg-surface-muted px-3 py-2.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-verified" />
            Encrypted at rest · GDPR compliant · NI-only verifications
          </div>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signup" ? "login" : "signup")}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {mode === "signup" ? "Log in" : "Sign up"}
            </button>
          </p>
        </section>
      </main>
    </div>
  );
}