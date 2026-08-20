import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MessageSquarePlus, X, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const OPEN_EVENT = "roost:open-beta-feedback";
const BANNER_KEY = "roost.beta-banner.dismissed";

export function openBetaFeedback() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

const CATEGORIES = [
  { value: "bug", label: "Something broke" },
  { value: "confusing", label: "Confusing" },
  { value: "idea", label: "Idea" },
  { value: "praise", label: "Worked well" },
  { value: "other", label: "Other" },
] as const;

const feedbackSchema = z.object({
  category: z.enum(["bug", "confusing", "idea", "praise", "other"]),
  message: z
    .string()
    .trim()
    .min(5, { message: "Please add a little more detail (5 characters minimum)." })
    .max(2000, { message: "Please keep feedback under 2000 characters." }),
});

/**
 * Floating beta feedback launcher. Only rendered for signed-in testers.
 */
export function BetaFeedbackWidget() {
  const { user, profile, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["value"]>("bug");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (loading || !user) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const parsed = feedbackSchema.safeParse({ category, message });
    if (!parsed.success) {
      toast.error("Check your feedback", {
        description: parsed.error.issues[0]?.message,
      });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("beta_feedback").insert({
        user_id: user.id,
        category: parsed.data.category,
        message: parsed.data.message,
        page_path: window.location.pathname,
        account_type: profile?.account_type ?? null,
      });
      if (error) throw error;
      toast.success("Thanks — feedback received", {
        description: "Every note during the beta helps us sharpen Roost.",
      });
      setMessage("");
      setOpen(false);
    } catch (err) {
      toast.error("Couldn't send that", {
        description: err instanceof Error ? err.message : "Please try again in a moment.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Send beta feedback"
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-border bg-foreground px-4 py-2.5 text-xs font-semibold text-[var(--color-primary-foreground)] shadow-floating transition hover:translate-y-[-1px] sm:bottom-6 sm:right-6 sm:text-sm"
      >
        <MessageSquarePlus className="h-4 w-4 shrink-0" />
        Feedback
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Send beta feedback"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <form
            onSubmit={submit}
            className="w-full max-w-md rounded-3xl border border-border bg-surface p-5 shadow-floating sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Roost beta
                </p>
                <h2 className="mt-1 font-display text-lg font-semibold tracking-tight">
                  Tell us what you found
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-full border border-border bg-surface p-1.5 text-muted-foreground transition hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => {
                const active = category === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    aria-pressed={active}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? "border-verified/40 bg-verified-soft text-foreground shadow-resting"
                        : "border-border bg-surface-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>

            <label className="mt-4 block">
              <span className="text-sm font-medium text-foreground">What happened?</span>
              <textarea
                required
                rows={5}
                maxLength={2000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Where you were, what you expected, and what actually happened."
                className="mt-1.5 w-full rounded-2xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/80 focus:border-verified/40 focus:outline-none focus:ring-2 focus:ring-verified/20"
              />
            </label>

            <p className="mt-2 text-xs text-muted-foreground">
              We record the page you were on. Please don't paste other people's personal details.
            </p>

            <button
              type="submit"
              disabled={submitting}
              className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-foreground px-6 py-3 font-display text-sm font-semibold text-[var(--color-primary-foreground)] shadow-raised transition hover:bg-foreground/92 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Sending…" : "Send feedback"}
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}

/** Dismissible in-app beta notice shown at the top of the dashboard. */
export function BetaBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(window.localStorage.getItem(BANNER_KEY) !== "1");
  }, []);

  if (!visible) return null;

  return (
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-verified/30 bg-verified-soft/60 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2.5">
        <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-verified" />
        <p className="text-sm text-foreground">
          <span className="font-semibold">You're in the Roost beta.</span>{" "}
          <span className="text-muted-foreground">
            Use real steps but test data only — tell us anything that feels off.
          </span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          to="/beta"
          className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary"
        >
          How to test
        </Link>
        <button
          type="button"
          onClick={openBetaFeedback}
          className="rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-[var(--color-primary-foreground)] transition hover:bg-foreground/92"
        >
          Send feedback
        </button>
        <button
          type="button"
          aria-label="Dismiss beta notice"
          onClick={() => {
            window.localStorage.setItem(BANNER_KEY, "1");
            setVisible(false);
          }}
          className="rounded-full p-1.5 text-muted-foreground transition hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}