import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Home, Mail, Lock, UserRound, ShieldCheck, Building2, IdCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { role?: "tenant" | "landlord" } => {
    const role = search['role'];
    return role === "tenant" || role === "landlord" ? { role } : {};
  },
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
type Mode = "signup" | "login" | "reset";

const COMMON_EMAIL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "yahoo.com",
  "yahoo.co.uk",
  "live.com",
  "me.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
  "btinternet.com",
] as const;

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let prevDiag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = a[i - 1] === b[j - 1]
        ? prevDiag
        : 1 + Math.min(prevDiag, prev[j - 1], prev[j]);
      prevDiag = tmp;
    }
  }
  return prev[b.length];
}

function suggestEmailFix(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();
  if (!domain.includes(".")) return null;
  if ((COMMON_EMAIL_DOMAINS as readonly string[]).includes(domain)) return null;
  let best: { domain: string; dist: number } | null = null;
  for (const candidate of COMMON_EMAIL_DOMAINS) {
    const dist = levenshtein(domain, candidate);
    if (dist > 0 && dist <= 2 && (!best || dist < best.dist)) {
      best = { domain: candidate, dist };
    }
  }
  return best ? `${local}@${best.domain}` : null;
}

function AuthPage() {
  const navigate = useNavigate();
  const { role: roleFromSearch } = Route.useSearch();
  const [role, setRole] = useState<Role>(roleFromSearch ?? "tenant");
  const [mode, setMode] = useState<Mode>("signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    const routeByAccountType = async (userId: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("account_type")
        .eq("id", userId)
        .maybeSingle();
      const target = "/dashboard";
      navigate({ to: target });
    };

    // Initial session check (handles email-confirmation redirects landing here)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        void routeByAccountType(data.session.user.id);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setTimeout(() => {
          void navigate({ to: "/reset-password" });
        }, 0);
        return;
      }
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user) {
        // Defer to avoid deadlocking the auth callback
        setTimeout(() => {
          void routeByAccountType(session.user.id);
        }, 0);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== email) setEmail(normalizedEmail);
    if (!suggestionDismissed) {
      const suggestion = suggestEmailFix(normalizedEmail);
      if (suggestion) {
        setEmailSuggestion(suggestion);
        return;
      }
    }
    setSubmitting(true);
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error && !/user|not found/i.test(error.message)) throw error;
        setResetSent(true);
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
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
        // onAuthStateChange will handle the role-based redirect
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (error) throw error;
        toast.success("Signed in");
        // onAuthStateChange will handle the role-based redirect
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(
        mode === "signup" ? "Sign-up failed" : mode === "reset" ? "Couldn't send reset link" : "Sign-in failed",
        { description: message },
      );
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
            {mode === "signup" ? "Create your account" : mode === "reset" ? "Password reset" : "Welcome back"}
          </p>
          <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {mode === "signup" ? "Join Roost NI" : mode === "reset" ? "Forgot your password?" : "Sign in to Roost"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signup"
              ? "Verified passports for renters. Compliant listings for landlords."
              : mode === "reset"
                ? "Enter your email and we'll send you a link to set a new one."
                : "Continue to your passport or property dashboard."}
          </p>
        </div>

        <section className="rounded-3xl border border-border bg-surface p-5 shadow-floating sm:p-7">
          {mode === "reset" ? null : (
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
                      ? "bg-surface text-foreground shadow-raised"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
          )}

          {mode === "reset" && resetSent ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-verified/30 bg-verified-soft/60 p-4 text-sm text-foreground">
                <p className="font-medium">Check your inbox</p>
                <p className="mt-1 text-muted-foreground">
                  If an account exists for <span className="font-mono">{email}</span>, we've sent a link to reset your
                  password. The link expires after a short while — request another if it does.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setResetSent(false);
                  setMode("login");
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3.5 font-display text-sm font-semibold text-[var(--color-primary-foreground)] transition hover:bg-foreground/92"
              >
                Back to sign in
              </button>
            </div>
          ) : (
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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailSuggestion(null);
                    setSuggestionDismissed(false);
                  }}
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={`${inputCx} pl-9`}
                />
              </div>
              {emailSuggestion ? (
                <div className="mt-2 rounded-xl border border-verified/30 bg-verified-soft/60 px-3 py-2 text-xs text-foreground">
                  Did you mean{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(emailSuggestion);
                      setEmailSuggestion(null);
                      setSuggestionDismissed(true);
                    }}
                    className="font-mono font-semibold text-verified underline-offset-2 hover:underline"
                  >
                    {emailSuggestion}
                  </button>
                  ?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setEmailSuggestion(null);
                      setSuggestionDismissed(true);
                    }}
                    className="ml-1 text-muted-foreground underline-offset-2 hover:underline"
                  >
                    Keep typed
                  </button>
                </div>
              ) : null}
            </label>

            {mode === "reset" ? null : (
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
                {mode === "login" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPassword("");
                      setResetSent(false);
                      setMode("reset");
                    }}
                    className="mt-2 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Forgot your password?
                  </button>
                ) : null}
              </label>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3.5 font-display text-sm font-semibold text-[var(--color-primary-foreground)] shadow-raised transition hover:translate-y-[-1px] hover:bg-foreground/92 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Please wait…"
                : mode === "signup"
                  ? role === "landlord"
                    ? "Create Landlord Account"
                    : "Create Tenant Account"
                  : mode === "reset"
                    ? "Send reset link"
                    : "Sign in"}
            </button>

            {mode === "reset" ? (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Back to sign in
              </button>
            ) : null}
          </form>
          )}

          <div className="mt-4 flex items-center gap-2 rounded-xl bg-surface-muted px-3 py-2.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-verified" />
            Encrypted at rest · GDPR compliant · NI-only verifications
          </div>

          {mode === "reset" ? null : (
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
          )}
        </section>
      </main>
    </div>
  );
}