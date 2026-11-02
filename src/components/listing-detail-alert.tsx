import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BellRing, CheckCircle2, Loader2, X } from "lucide-react";
import { subscribeToListingAlerts } from "@/lib/listing-alerts.functions";
import { posthog } from "@/integrations/posthog/client";
import { getEventContext } from "@/lib/utm-session";
import { useAuth } from "@/hooks/use-auth";

export interface AlertListing {
  id: string;
  location: string | null;
  bedrooms: number | null;
  monthly_rent: number;
}

type Position = "inline_top" | "floating_bar";
const DONE_KEY = "roostni_property_alert_done";
const DISMISS_KEY = "roostni_property_alert_bar_dismissed";

const areaOf = (l: AlertListing) => l.location?.trim() || "Northern Ireland";
const baseProps = (l: AlertListing, position: Position) => ({
  listing_id: l.id,
  area: areaOf(l),
  position,
});

function AlertForm({
  listing,
  position,
  onDone,
}: {
  listing: AlertListing;
  position: Position;
  onDone: () => void;
}) {
  const subscribe = useServerFn(subscribeToListingAlerts);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const area = areaOf(listing);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      toast.error("Enter a valid email address");
      return;
    }
    setSaving(true);
    try {
      const utm = getEventContext() as Record<string, string>;
      await subscribe({
        data: {
          email: trimmed,
          utm,
          alert: {
            area,
            bedrooms: listing.bedrooms ?? undefined,
            maxRent: Math.round(Number(listing.monthly_rent) || 0) || undefined,
            listingId: listing.id,
          },
        },
      });
      posthog.capture("property_alert_signup_completed", {
        ...baseProps(listing, position),
        bedrooms: listing.bedrooms,
        max_rent: listing.monthly_rent,
        ...utm,
      });
      sessionStorage.setItem(DONE_KEY, "1");
      onDone();
    } catch {
      toast.error("Couldn't save that just now", { description: "Please try again in a moment." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-2">
      <div className="flex gap-2">
        <input
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          aria-label="Email address"
          className="h-9 min-w-0 flex-1 rounded-sm border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground/80 focus:outline-none focus:ring-2 focus:ring-verified/20"
        />
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-sm bg-foreground px-3 text-sm font-semibold text-[var(--color-primary-foreground)] disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Alert me
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        We'll only email you about new listings in {area}. Unsubscribe any time.
      </p>
    </form>
  );
}

function DoneMessage({ listing, position }: { listing: AlertListing; position: Position }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-verified" />
      <div>
        <p className="font-semibold">You're on the list for {areaOf(listing)}.</p>
        <p className="text-xs text-muted-foreground">
          Planning to rent soon?{" "}
          <Link
            to="/auth"
            search={{ role: "tenant", next: `/listings/${listing.id}`, listingId: listing.id }}
            onClick={() =>
              posthog.capture("property_alert_auth_nudge_clicked", {
                ...baseProps(listing, position),
                destination: "/auth",
              })
            }
            className="font-medium text-verified underline-offset-2 hover:underline"
          >
            Create your Tenant Passport
          </Link>{" "}
          to apply in one tap.
        </p>
      </div>
    </div>
  );
}

/** Slim one-line prompt above the gallery; expands to the email form on tap. */
export function PropertyAlertInline({ listing }: { listing: AlertListing }) {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const shown = useRef(false);
  const visible = !loading && !user;

  useEffect(() => {
    if (visible && !shown.current) {
      shown.current = true;
      posthog.capture("property_alert_prompt_shown", { ...baseProps(listing, "inline_top"), trigger: "immediate" });
    }
  }, [visible, listing]);

  if (!visible) return null;

  return (
    <div className="mt-3 rounded-sm border border-verified/30 bg-verified-soft/40 px-3 py-2">
      {done ? (
        <DoneMessage listing={listing} position="inline_top" />
      ) : open ? (
        <>
          <p className="text-xs font-semibold">Get alerted when similar homes in {areaOf(listing)} are listed</p>
          <AlertForm listing={listing} position="inline_top" onDone={() => setDone(true)} />
        </>
      ) : (
        <button
          type="button"
          onClick={() => {
            posthog.capture("property_alert_prompt_clicked", baseProps(listing, "inline_top"));
            setOpen(true);
          }}
          className="flex w-full items-center gap-2 text-left text-xs font-semibold text-foreground"
        >
          <BellRing className="h-4 w-4 shrink-0 text-verified" />
          <span className="flex-1">Get alerted when similar homes in {areaOf(listing)} are listed</span>
          <span className="shrink-0 text-verified underline underline-offset-2">Alert me</span>
        </button>
      )}
    </div>
  );
}

/** Dismissible bottom bar after 50% scroll or 20 seconds, once per session. */
export function PropertyAlertBar({ listing }: { listing: AlertListing }) {
  const { user, loading } = useAuth();
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (loading || user) return;
    if (sessionStorage.getItem(DONE_KEY) || sessionStorage.getItem(DISMISS_KEY)) return;
    let fired = false;
    const fire = (trigger: "scroll" | "timer") => {
      if (fired || sessionStorage.getItem(DONE_KEY)) return;
      fired = true;
      setShow(true);
      posthog.capture("property_alert_prompt_shown", { ...baseProps(listing, "floating_bar"), trigger });
      cleanup();
    };
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max >= 0.5) fire("scroll");
    };
    const timer = window.setTimeout(() => fire("timer"), 20000);
    window.addEventListener("scroll", onScroll, { passive: true });
    const cleanup = () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
    return cleanup;
  }, [loading, user, listing]);

  if (!show) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-foreground bg-surface p-3 shadow-floating">
      <div className="mx-auto flex max-w-3xl items-start gap-2">
        <div className="min-w-0 flex-1">
          {done ? (
            <DoneMessage listing={listing} position="floating_bar" />
          ) : open ? (
            <>
              <p className="text-xs font-semibold">Watching for rentals in {areaOf(listing)}?</p>
              <AlertForm listing={listing} position="floating_bar" onDone={() => setDone(true)} />
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                posthog.capture("property_alert_prompt_clicked", baseProps(listing, "floating_bar"));
                setOpen(true);
              }}
              className="flex w-full items-center gap-2 text-left text-sm font-semibold"
            >
              <BellRing className="h-4 w-4 shrink-0 text-verified" />
              <span className="flex-1">Watching for rentals in {areaOf(listing)}? Get alerted when new direct listings go up.</span>
              <span className="shrink-0 text-verified underline underline-offset-2">Alert me</span>
            </button>
          )}
        </div>
        <button type="button" onClick={dismiss} aria-label="Close" className="shrink-0 p-1 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
