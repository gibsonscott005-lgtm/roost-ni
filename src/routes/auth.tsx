import { getEventContext } from "@/lib/utm-session";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LogoMark } from "@/components/logo";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Mail, Lock, UserRound, ShieldCheck, Building2, IdCard, Home, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { posthog } from "@/integrations/posthog/client";
import { sendWelcomeEmail } from "@/lib/welcome-email.functions";

export const Route = createFileRoute("/auth")({
  staticData: { sitemap: false },
  validateSearch: (
    search: Record<string, unknown>,
  ): { role?: "tenant" | "landlord"; next?: string; email?: string; listingId?: string; mode?: "login" } => {
    const role = search['role'];
    const rawNext = search['next'];
    const rawEmail = search['email'];
    const rawListingId = search['listingId'];
    const rawMode = search['mode'];
    // Same-origin paths only: a leading "//" is a scheme-relative external
    // URL, and a backslash anywhere (e.g. "/\evil.example") is normalised by
    // browsers into one — reject both.
    const next =
      typeof rawNext === "string" &&
      rawNext.startsWith("/") &&
      !rawNext.startsWith("//") &&
      !rawNext.includes("\\")
        ? rawNext
        : undefined;
    const email =
      typeof rawEmail === "string" && rawEmail.includes("@") && rawEmail.length <= 200
        ? rawEmail
        : undefined;
    const listingId =
      typeof rawListingId === "string" && /^[0-9a-fA-F-]{36}$/.test(rawListingId)
        ? rawListingId
        : undefined;
    return {
      ...(role === "tenant" || role === "landlord" ? { role } : {}),
      ...(next ? { next } : {}),
      ...(email ? { email } : {}),
      ...(listingId ? { listingId } : {}),
      ...(rawMode === "login" ? { mode: "login" as const } : {}),
    };
  },


  head: () => ({
    meta: [
      { title: "Sign in or sign up — RoostNI" },
      {
        name: "description",
        content:
          "Create a free Tenant or Landlord account on RoostNI. Email sign-up for renters and property owners in Northern Ireland.",
      },
      { property: "og:title", content: "Sign in or sign up — RoostNI" },
      {
        property: "og:description",
        content:
          "Create a free Tenant or Landlord account on RoostNI — tenant passports and compliant listings for Northern Ireland.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://roostni.co.uk/auth" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://roostni.co.uk/auth" }],
  }),
  component: AuthPage,
});

type Role = "tenant" | "landlord";
type Mode = "signup" | "login" | "reset";

const COMMON_EMAIL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "outlook.co.uk",
  "hotmail.com",
  "hotmail.co.uk",
  "icloud.com",
  "yahoo.com",
  "yahoo.co.uk",
  "live.com",
  "live.co.uk",
  "msn.com",
  "me.com",
  "mac.com",
  "aol.com",
  "aol.co.uk",
  "protonmail.com",
  "proton.me",
  "btinternet.com",
  "btopenworld.com",
  "sky.com",
  "talktalk.net",
  "virginmedia.com",
  "blueyonder.co.uk",
  "ntlworld.com",
  "tiscali.co.uk",
  "zen.co.uk",
  "plus.com",
  "gmx.co.uk",
  "yandex.com",
  "mail.com",
] as const;

// Valid public suffixes we expect from UK/NI renters and landlords.
const VALID_TLDS = new Set([
  "com",
  "net",
  "org",
  "uk",
  "ie",
  "me",
  "io",
  "co",
  "eu",
  "info",
  "biz",
  "scot",
  "wales",
  "email",
  "dev",
  "app",
  "gov",
  "ac",
  "nhs",
  "police",
  "sch",
  "edu",
  "de",
  "fr",
  "es",
  "it",
  "nl",
  "pl",
  "au",
  "nz",
  "ca",
  "us",
]);

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

function hasInvalidTld(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at < 1) return false;
  const domain = email.slice(at + 1).toLowerCase();
  const parts = domain.split(".");
  if (parts.length < 2) return true;
  const tld = parts[parts.length - 1] ?? "";
  if (tld.length < 2 || /[^a-z]/.test(tld)) return true;
  return !VALID_TLDS.has(tld);
}

function suggestEmailFix(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();
  if (!domain.includes(".")) return null;
  if ((COMMON_EMAIL_DOMAINS as readonly string[]).includes(domain)) return null;
  const invalidTld = hasInvalidTld(email);
  const maxDist = invalidTld ? 3 : 2;
  let best: { domain: string; dist: number } | null = null;
  for (const candidate of COMMON_EMAIL_DOMAINS) {
    const dist = levenshtein(domain, candidate);
    if (dist > 0 && dist <= maxDist && (!best || dist < best.dist)) {
      best = { domain: candidate, dist };
    }
  }
  return best ? `${local}@${best.domain}` : null;
}

function AuthPage() {
  const navigate = useNavigate();
  const {
    role: roleFromSearch,
    next: nextFromSearch,
    email: emailFromSearch,
    listingId,
    mode: modeFromSearch,
  } = Route.useSearch();
  const [role, setRole] = useState<Role>(roleFromSearch ?? "tenant");
  const [mode, setMode] = useState<Mode>(modeFromSearch ?? "signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(emailFromSearch ?? "");

  const [password, setPassword] = useState("");
  const [hearAboutUs, setHearAboutUs] = useState("");
  const [utmParams, setUtmParams] = useState<{ source?: string; medium?: string; campaign?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  // Synchronous lock: state updates lag a frame, so a rapid double-tap on
  // mobile can fire two sign-up requests before `submitting` turns true.
  const submitLockRef = useRef(false);
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const [emailWarning, setEmailWarning] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [listingTitle, setListingTitle] = useState<string | null>(null);

  // Visitors arriving from a property's "Apply" button get context about the
  // home they were looking at, so the sign-up wall doesn't feel like a dead end.
  const backToListingId = nextFromSearch?.match(/^\/listings\/([0-9a-fA-F-]{36})/)?.[1];

  useEffect(() => {
    if (!listingId) return;
    let cancelled = false;
    supabase
      .from("property_listings")
      .select("title")
      .eq("id", listingId)
      .eq("is_published", true)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.title) setListingTitle(data.title as string);
      });
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  useEffect(() => {
    const ctx = getEventContext();
    setUtmParams({ source: ctx.source, medium: ctx.medium, campaign: ctx.campaign });
  }, []);

  useEffect(() => {
    const routeByAccountType = async (userId: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("account_type")
        .eq("id", userId)
        .maybeSingle();
      // Honour a preserved same-origin return path (e.g. the OAuth consent screen).
      if (nextFromSearch) {
        window.location.href = nextFromSearch;
        return;
      }
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
  }, [navigate, nextFromSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== email) setEmail(normalizedEmail);
    if (!suggestionDismissed) {
      const suggestion = suggestEmailFix(normalizedEmail);
      if (suggestion) {
        setEmailWarning(null);
        setEmailSuggestion(suggestion);
        return;
      }
      if (hasInvalidTld(normalizedEmail)) {
        setEmailWarning(
          "That email address ends in something we don't recognise. Please double-check it — if it's right, tap continue again.",
        );
        setSuggestionDismissed(true);
        return;
      }
    }
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setSubmitting(true);
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error && !/user|not found/i.test(error.message)) throw error;
        setResetSent(true);
      } else if (mode === "signup") {
        const signupData: Record<string, string> = {
          full_name: fullName,
          account_type: role,
        };
        if (hearAboutUs.trim()) signupData.hear_about_us = hearAboutUs.trim();
        if (utmParams.source) signupData.utm_source = utmParams.source;
        if (utmParams.medium) signupData.utm_medium = utmParams.medium;
        if (utmParams.campaign) signupData.utm_campaign = utmParams.campaign;

        posthog.capture("sign_up_started", {
          account_type: role,
          source: hearAboutUs.trim() || undefined,
          utm_source: utmParams.source,
          utm_medium: utmParams.medium,
          utm_campaign: utmParams.campaign,
        });

        const { data: signUpResult, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth${
              nextFromSearch ? `?next=${encodeURIComponent(nextFromSearch)}` : ""
            }`,
            data: signupData,
          },
        });
        if (error) throw error;
        // Fire-and-forget welcome email — never blocks or breaks sign-up.
        if (signUpResult.user?.id) {
          sendWelcomeEmail({ data: { userId: signUpResult.user.id } }).catch(() => {});
        }
        toast.success("Account created", {
          description:
            role === "landlord"
              ? "Welcome to RoostNI. Your landlord dashboard is ready."
              : "Welcome to RoostNI. Your tenant passport is being prepared.",
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
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  const inputCx =
    "h-11 w-full rounded-xl border border-border bg-surface shadow-resting px-3.5 text-sm text-foreground placeholder:text-muted-foreground/80 transition focus:border-verified/40 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-verified/20";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70 bg-surface/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <LogoMark />
            <span className="font-display text-base font-semibold tracking-tight">
              Roost<span className="text-verified">NI</span>
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              to="/beta"
              className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
            >
              About the beta
            </Link>
            <Link
              to="/help"
              className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
            >
              Help
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-col px-4 pb-12 pt-5 sm:px-6 sm:pt-10">
        {listingId ? (
          <div className="mb-4 rounded-2xl border border-verified/25 bg-verified-soft/50 p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface text-verified shadow-resting">
                <Home className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {listingTitle
                    ? `You're applying for "${listingTitle}"`
                    : "You're applying for this property"}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Create your free Tenant Passport to send your details to the landlord —
                  it takes about 2 minutes, and we'll bring you straight back to the
                  listing.
                </p>
                {backToListingId ? (
                  <Link
                    to="/listings/$id"
                    params={{ id: backToListingId }}
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-verified underline-offset-2 hover:underline"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Back to the property
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
        <div className="mb-5 text-center sm:mb-6">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {mode === "signup" ? "Create your account" : mode === "reset" ? "Password reset" : "Welcome back"}
          </p>
          <h1 className="mt-1 font-display text-xl font-semibold tracking-tight sm:mt-1.5 sm:text-3xl">
            {mode === "signup" ? "Join RoostNI" : mode === "reset" ? "Forgot your password?" : "Sign in to RoostNI"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signup"
              ? "Verified passports for renters. Compliant listings for landlords."
              : mode === "reset"
                ? "Enter your email and we'll send you a link to set a new one."
                : "Continue to your passport or property dashboard."}
          </p>
        </div>

        <section className="rounded-3xl border border-border bg-surface p-4 shadow-floating sm:p-7">
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

            {mode === "signup" ? (
              <fieldset className="block">
                <legend className="text-sm font-medium text-foreground">
                  How did you hear about us?{" "}
                  <span className="font-normal text-muted-foreground">(optional — one tap)</span>
                </legend>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {[
                    { label: "Facebook", value: "Facebook or community group" },
                    { label: "Google / search", value: "Search engine" },
                    { label: "Friend or colleague", value: "Friend or colleague" },
                    { label: "Landlord group (LANI)", value: "Landlord association (LANI)" },
                    { label: "Other", value: "Other" },
                  ].map((option) => {
                    const selected = hearAboutUs === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setHearAboutUs(selected ? "" : option.value)}
                        className={`rounded-full border px-3.5 py-2 text-xs font-medium transition ${
                          selected
                            ? "border-verified/50 bg-verified-soft/70 text-foreground shadow-resting"
                            : "border-border bg-surface text-muted-foreground hover:border-verified/30 hover:text-foreground"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
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
                    setEmailWarning(null);
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
              {!emailSuggestion && emailWarning ? (
                <p className="mt-2 rounded-xl border border-amber-400/40 bg-amber-100/50 px-3 py-2 text-xs text-foreground">
                  {emailWarning}
                </p>
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
            100% free during the beta · Encrypted at rest · GDPR compliant
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

        <p className="mt-8 text-center text-xs text-muted-foreground">
          New to the beta?{" "}
          <Link to="/beta" className="font-medium text-foreground underline-offset-4 hover:underline">
            Read what we'd like you to test
          </Link>{" "}
          or visit the{" "}
          <Link to="/help" className="font-medium text-foreground underline-offset-4 hover:underline">
            help centre
          </Link>
          .
        </p>
      </main>
    </div>
  );
}