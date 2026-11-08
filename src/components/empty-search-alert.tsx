import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BellRing, CheckCircle2, Loader2 } from "lucide-react";
import { subscribeToListingAlerts } from "@/lib/listing-alerts.functions";
import { posthog } from "@/integrations/posthog/client";
import { getEventContext } from "@/lib/utm-session";

/** Email-only alert prompt shown when a listings search returns no homes. */
export function EmptySearchAlert({ area, bedrooms, maxRent }: { area: string; bedrooms?: number; maxRent?: number }) {
  const subscribe = useServerFn(subscribeToListingAlerts);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const props = { area, bedrooms: bedrooms ?? null, max_rent: maxRent ?? null, position: "empty_search" };

  useEffect(() => {
    const t = setTimeout(() => posthog.capture("property_alert_empty_search_shown", props), 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area, bedrooms, maxRent]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      toast.error("Enter a valid email address");
      return;
    }
    setState("saving");
    try {
      const utm = getEventContext() as Record<string, string>;
      await subscribe({ data: { email: trimmed, utm, alert: { area, bedrooms, maxRent } } });
      posthog.capture("property_alert_empty_search_submitted", { ...props, ...utm });
      setState("done");
    } catch {
      toast.error("Couldn't save that just now", { description: "Please try again in a moment." });
      setState("idle");
    }
  };

  return (
    <div className="mx-auto mt-10 max-w-md rounded-sm border border-border bg-surface p-5">
      {state === "done" ? (
        <p className="flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 className="h-4 w-4 text-verified" /> You're on the list for {area}.
        </p>
      ) : (
        <form onSubmit={submit}>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <BellRing className="h-4 w-4 text-verified" /> No homes here yet. Get an email when one is listed in {area}.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              aria-label="Email address"
              className="h-9 min-w-0 flex-1 rounded-sm border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/80 focus:outline-none focus:ring-2 focus:ring-verified/20"
            />
            <button
              type="submit"
              disabled={state === "saving"}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-sm bg-foreground px-3 text-sm font-semibold text-[var(--color-primary-foreground)] disabled:opacity-60"
            >
              {state === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Alert me
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            We'll only email you about new listings in {area}. Unsubscribe any time.
          </p>
        </form>
      )}
    </div>
  );
}
