import { getEventContext } from "@/lib/utm-session";
import { SiteTicker } from "@/components/brutal";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LogoMark } from "@/components/logo";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CheckCircle2,
  ClipboardCheck,
  FileSignature,
  Loader2,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import {
  AUDIT_QUESTIONS,
  PROPERTY_COUNT_OPTIONS,
  scoreAudit,
  type AuditAnswers,
} from "@/lib/audit";
import { saveAuditResult } from "@/lib/audit.functions";
import { posthog } from "@/integrations/posthog/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/audit")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "NI Landlord Compliance & Tenancy Readiness Audit — RoostNI" },
      {
        name: "description",
        content:
          "A free one-minute check for Northern Ireland landlords: registration, tenancy notice, deposit protection, rent receipts, EPC and alarms. See your score and your gaps.",
      },
      {
        property: "og:title",
        content: "Is your Northern Ireland tenancy paperwork in order?",
      },
      {
        property: "og:description",
        content:
          "Five questions, under a minute, no account needed. Get a plain-English list of what's missing from your NI tenancy records.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://roostni.co.uk/audit" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://roostni.co.uk/audit" }],
  }),
  component: AuditPage,
});

type Stage = "intro" | "questions" | "result";

function AuditPage() {
  const { user } = useAuth();
  const [stage, setStage] = useState<Stage>("intro");
  const [answers, setAnswers] = useState<AuditAnswers>({});
  const [email, setEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [propertyCount, setPropertyCount] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [utm, setUtm] = useState<Record<string, string>>({});
  const topRef = useRef<HTMLDivElement>(null);
  const save = useServerFn(saveAuditResult);

  useEffect(() => {
    setUtm(getEventContext() as Record<string, string>);
  }, []);

  const areaQuestions = AUDIT_QUESTIONS;
  const areaComplete = areaQuestions.every((q) => answers[q.id]);
  const answeredCount = AUDIT_QUESTIONS.filter((q) => answers[q.id]).length;
  const result = useMemo(() => scoreAudit(answers), [answers]);

  const scrollTop = () => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const start = () => {
    setStage("questions");
    posthog.capture("audit_started", { ...utm });
  };

  const next = () => {
    const final = scoreAudit(answers);
    try {
      window.localStorage.setItem(
        "roostni_audit_last",
        JSON.stringify({ score: final.score, band: final.band }),
      );
    } catch {
      /* ignore */
    }
    setStage("result");
    scrollTop();
    posthog.capture("audit_completed", {
      score: final.score,
      band: final.band,
      gap_count: final.gaps.length,
      signed_in: !!user,
      ...utm,
    });
    // Signed-in landlords: record the result against their account email
    // automatically so they never need to re-enter details.
    if (user?.email) {
      void save({
        data: {
          email: user.email.toLowerCase(),
          score: final.score,
          band: final.band,
          answers,
          gaps: final.gaps.map((g) => g.gap),
          utm,
        },
      })
        .then(() => setSaved(true))
        .catch(() => {});
    }
  };

  const back = () => {
    setStage("intro");
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await save({
        data: {
          email: email.trim().toLowerCase(),
          ...(contactName.trim() ? { contactName: contactName.trim() } : {}),
          ...(propertyCount ? { propertyCount } : {}),
          score: result.score,
          band: result.band,
          answers,
          gaps: result.gaps.map((g) => g.gap),
          utm,
        },
      });
      setSaved(true);
      posthog.capture("audit_saved", { score: result.score, band: result.band, ...utm });
    } catch {
      toast.error("We couldn't save that just now. Please try again in a moment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteTicker />
      <header className="border-b border-border/70 bg-surface/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <LogoMark />
            <span className="font-display text-sm font-semibold tracking-tight sm:text-base">
              Roost<span className="text-verified">NI</span>
            </span>
          </Link>
          <Link
            to="/listings"
            className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            Browse properties
          </Link>
        </div>
      </header>

      <main ref={topRef} className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-14">
        {stage === "intro" ? (
          <section>
            <span className="inline-flex -rotate-2 items-center gap-2 border-2 border-background bg-verified px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest text-verified-foreground shadow-raised">
              <ClipboardCheck className="h-3.5 w-3.5" />
              Free self-check
            </span>
            <p className="brutal-bubble-paper mt-5 max-w-md px-4 py-3 text-sm font-semibold">
              RoostNI offers free direct management for Northern Ireland landlords. No fees,
              no card required.
            </p>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[0.95] tracking-tight sm:text-6xl">
              Is your Northern Ireland tenancy paperwork in order<span className="text-verified">?</span>
            </h1>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              Five quick questions on the rules NI landlords are most often caught out by —
              registration, the 28-day tenancy notice, deposit protection, rent receipts, and
              EPC and alarms. You'll get a score and a plain-English list of what's missing.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-verified" />
                Takes under a minute. No account, no email needed to see your result.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-verified" />
                Nothing about your tenant — this looks only at your own records.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-verified" />
                A self-check to help you get organised. It isn't legal advice.
              </li>
            </ul>
            <button
              type="button"
              onClick={start}
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 font-display text-sm font-semibold text-[var(--color-primary-foreground)] shadow-raised transition hover:bg-foreground/92"
            >
              Start the audit
              <ArrowRight className="h-4 w-4" />
            </button>
            <p className="mt-8 text-xs text-muted-foreground">
              RoostNI helps self-managing landlords in Northern Ireland track compliance
              deadlines, leases and rent records. Applicants provide their own self-certified
              documents in one organised pack — RoostNI never vets or scores a tenant, and does
              not provide credit scores or legal advice.
            </p>
          </section>
        ) : null}

        {stage === "questions" ? (
          <section>
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Quick check</span>
              <span>
                {answeredCount} of {AUDIT_QUESTIONS.length} answered
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-verified transition-all"
                style={{ width: `${(answeredCount / AUDIT_QUESTIONS.length) * 100}%` }}
              />
            </div>

            <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Five quick questions
            </h1>

            <div className="mt-6 space-y-4">
              {areaQuestions.map((q) => (
                <fieldset
                  key={q.id}
                  className="rounded-3xl border border-border bg-surface p-5 shadow-resting"
                >
                  <legend className="sr-only">{q.question}</legend>
                  <p className="text-sm font-semibold text-foreground sm:text-base">
                    {q.question}
                  </p>
                  {q.help ? (
                    <p className="mt-1.5 text-xs text-muted-foreground">{q.help}</p>
                  ) : null}
                  <div className="mt-3.5 space-y-2">
                    {q.options.map((opt) => {
                      const selected = answers[q.id] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            setAnswers((prev) => ({ ...prev, [q.id]: opt.value }))
                          }
                          className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition ${
                            selected
                              ? "border-verified bg-verified-soft/60 text-foreground"
                              : "border-border bg-surface text-muted-foreground hover:bg-secondary"
                          }`}
                        >
                          <span
                            className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
                              selected ? "border-verified bg-verified" : "border-border"
                            }`}
                          >
                            {selected ? (
                              <span className="h-1.5 w-1.5 rounded-full bg-surface" />
                            ) : null}
                          </span>
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={back}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-secondary"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                onClick={next}
                disabled={!areaComplete}
                className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-2.5 font-display text-sm font-semibold text-[var(--color-primary-foreground)] shadow-raised transition hover:bg-foreground/92 disabled:cursor-not-allowed disabled:opacity-45"
              >
                "See my result"
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            {!areaComplete ? (
              <p className="mt-2.5 text-right text-xs text-muted-foreground">
                Answer all five to see your result.
              </p>
            ) : null}
          </section>
        ) : null}

        {stage === "result" ? (
          <section>
            <p className="mb-4 rounded-2xl border border-border bg-surface-muted px-4 py-3 text-xs text-muted-foreground">
              RoostNI offers free direct management for Northern Ireland landlords. No fees, no
              card required.
            </p>
            <div className="rounded-3xl border border-border bg-surface p-6 shadow-resting sm:p-8">
              <div className="flex flex-wrap items-center gap-5">
                <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full border-4 border-verified/30 bg-verified-soft/50">
                  <span className="font-display text-3xl font-semibold tracking-tight">
                    {result.score}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Tenancy readiness
                  </p>
                  <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                    {result.band}
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">{result.bandNote}</p>
                </div>
              </div>

              <div className="mt-7 space-y-3">
                {result.areaScores.map((a) => (
                  <div key={a.area}>
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-foreground">{a.area}</span>
                      <span className="text-muted-foreground">{a.score}%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className="h-full rounded-full bg-foreground/70"
                        style={{ width: `${a.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <h2 className="mt-10 font-display text-xl font-semibold tracking-tight">
              {result.gaps.length === 0
                ? "Nothing outstanding"
                : `${result.gaps.length} ${result.gaps.length === 1 ? "gap" : "gaps"} to close`}
            </h2>
            {result.gaps.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                On your own answers, every item in this check is in place and evidenced.
                Worth re-running it whenever a certificate or tenancy changes.
              </p>
            ) : (
              <ol className="mt-4 space-y-3">
                {result.gaps.map((g, i) => (
                  <li
                    key={`${g.area}-${i}`}
                    className="rounded-2xl border border-border bg-surface p-5 shadow-resting"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {g.area}
                    </p>
                    <p className="mt-1.5 text-sm font-semibold text-foreground">{g.gap}</p>
                    <p className="mt-1.5 flex gap-2 text-sm text-muted-foreground">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-verified" />
                      {g.fix}
                    </p>
                  </li>
                ))}
              </ol>
            )}

            <h2 className="mt-12 font-display text-xl font-semibold tracking-tight">
              Beyond the paperwork — what else RoostNI does
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Keeping records straight is only part of it. RoostNI also handles the letting
              itself, so you don't need an agent or a Facebook thread to fill a property.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                {
                  icon: Banknote,
                  title: "Let direct, no agent fee",
                  body: "Advertise a vacant property to NI tenants yourself. Agents typically charge a month's rent, or £350–£600 plus VAT, just to find a tenant and draw up an agreement.",
                },
                {
                  icon: Users,
                  title: "Applications that arrive organised",
                  body: "Instead of forty unvetted messages, applicants apply with a Tenant Passport — their own ID, income and references in one pack, clearly marked as what they provided versus what you still check yourself.",
                },
                {
                  icon: FileSignature,
                  title: "The whole tenancy in one place",
                  body: "NI tenancy agreement signed on screen, room-by-room inventory, deposit dates, rent ledger and receipts, repair log, and correct notice periods worked out for you at the end.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-border bg-surface p-5 shadow-resting"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-verified-soft/70 text-foreground">
                    <item.icon className="h-4 w-4 text-verified" />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="mt-1.5 text-sm text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 rounded-2xl border border-border bg-surface-muted px-4 py-3 text-xs text-muted-foreground">
              Already have a tenant in place? You can keep a property private and off the
              public listings, and still hold its certificates, deposit dates and records —
              then advertise it only when it actually falls vacant.
            </p>

            <div className="mt-10 rounded-3xl border border-border bg-surface-muted/60 p-6 shadow-resting sm:p-8">
              {user ? (
                <div>
                  <p className="inline-flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
                    <CheckCircle2 className="h-5 w-5 text-verified" />
                    Result saved to your account
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Your score now shows on your dashboard checklist. Head back to add your
                    property and log the certificates this check asked about.
                  </p>
                  <Link
                    to="/dashboard"
                    onClick={() =>
                      posthog.capture("audit_cta_clicked", {
                        source: "audit_result_signed_in",
                        ...utm,
                      })
                    }
                    className="group mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-foreground px-6 py-3 font-display text-sm font-semibold text-[var(--color-primary-foreground)] shadow-raised transition hover:-translate-y-0.5 hover:bg-foreground/92"
                  >
                    Return to Dashboard &amp; Add Property
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </Link>
                </div>
              ) : saved ? (
                <div>
                  <p className="inline-flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
                    <CheckCircle2 className="h-5 w-5 text-verified" />
                    Saved to {email}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Next step: create your free account. RoostNI will hold the certificates, dates and
                    records this check asked about — and when the property next falls vacant,
                    you can advertise it and take applications without an agent's fee.
                  </p>
                  <Link
                    to="/auth"
                    search={{ role: "landlord", email }}
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 font-display text-sm font-semibold text-[var(--color-primary-foreground)] shadow-raised transition hover:bg-foreground/92"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Get started free — list, let and manage without agent fees
                  </Link>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Free direct management. Zero agent commissions, no card required. Keep a tenanted property
                    private, or advertise one when it's vacant.
                  </p>
                </div>
              ) : (
                <form onSubmit={onSave}>
                  <h2 className="font-display text-lg font-semibold tracking-tight">
                    Email me my NI compliance checklist
                  </h2>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Get your score, your gaps and the deadlines that apply, kept in one place
                    to refer back to. No newsletter, and nothing shared with anyone else.
                  </p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-medium text-foreground">Email</span>
                      <div className="relative mt-1.5">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="email"
                          required
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full rounded-2xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-verified"
                        />
                      </div>
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-foreground">
                        Name <span className="text-muted-foreground">(optional)</span>
                      </span>
                      <input
                        type="text"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="First name is fine"
                        className="mt-1.5 w-full rounded-2xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-verified"
                      />
                    </label>
                  </div>
                  <div className="mt-4">
                    <span className="text-xs font-medium text-foreground">
                      How many properties do you let?{" "}
                      <span className="text-muted-foreground">(optional)</span>
                    </span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {PROPERTY_COUNT_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setPropertyCount(propertyCount === opt ? "" : opt)}
                          className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                            propertyCount === opt
                              ? "border-verified bg-verified-soft/60 text-foreground"
                              : "border-border bg-surface text-muted-foreground hover:bg-secondary"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 font-display text-sm font-semibold text-[var(--color-primary-foreground)] shadow-raised transition hover:bg-foreground/92 disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Save my result
                  </button>
                </form>
              )}
            </div>

            {!saved && !user ? (
              <div className="mt-6">
                <Link
                  to="/auth"
                  search={{ role: "landlord" }}
                  onClick={() =>
                    posthog.capture("audit_cta_clicked", {
                      source: "audit_result_toolkit",
                      ...utm,
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 font-display text-sm font-semibold text-[var(--color-primary-foreground)] shadow-raised transition hover:bg-foreground/92"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Get started free — list, let and manage without agent fees
                </Link>
                <p className="mt-3 text-xs text-muted-foreground">
                  Free direct management. Zero agent commissions, no card required.
                </p>
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap items-center gap-4 text-sm">
              <button
                type="button"
                onClick={() => {
                  setAnswers({});
                  
                  setStage("intro");
                  setSaved(false);
                  scrollTop();
                }}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Start again
              </button>
              <Link
                to="/beta"
                className="font-medium text-muted-foreground underline-offset-4 hover:underline"
              >
                What is RoostNI?
              </Link>
            </div>

            <p className="mt-8 text-xs text-muted-foreground">
              This is a self-check based on your own answers. RoostNI helps self-managing
              landlords track compliance deadlines, leases and rent records. Applicants provide
              their own self-certified documents in one organised pack — RoostNI doesn't inspect
              your property, verify documents, provide credit scores or give legal advice.
            </p>
          </section>
        ) : null}
      </main>

      <footer className="border-t border-border/70 py-8">
        <p className="mx-auto w-full max-w-3xl px-4 text-xs text-muted-foreground sm:px-6">
          RoostNI — tenancy admin built for Northern Ireland.
        </p>
      </footer>
    </div>
  );
}
