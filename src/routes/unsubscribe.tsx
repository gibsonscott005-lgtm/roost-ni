import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { unsubscribeFromListingAlerts } from "@/lib/listing-alerts.functions";

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: z.object({ email: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Unsubscribe from listing alerts — RoostNI" },
      { name: "description", content: "Stop RoostNI new-listing alert emails for your address." },
      { property: "og:title", content: "Unsubscribe from listing alerts — RoostNI" },
      { property: "og:description", content: "Stop RoostNI new-listing alert emails for your address." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UnsubscribePage,
});

function UnsubscribePage() {
  const { email: initial } = Route.useSearch();
  const unsubscribe = useServerFn(unsubscribeFromListingAlerts);
  const [email, setEmail] = useState(initial ?? "");
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setState("saving");
    try {
      await unsubscribe({ data: { email: email.trim() } });
      setState("done");
    } catch {
      setState("error");
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-2xl font-bold">Unsubscribe from listing alerts</h1>
      {state === "done" ? (
        <p className="mt-4 text-sm">Done. You won't get any more new-listing emails from RoostNI.</p>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email address"
            className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm"
          />
          <button
            type="submit"
            disabled={state === "saving"}
            className="h-10 w-full rounded-sm bg-foreground text-sm font-semibold text-[var(--color-primary-foreground)] disabled:opacity-60"
          >
            Unsubscribe
          </button>
          {state === "error" ? <p className="text-sm text-destructive">Couldn't do that just now. Please try again.</p> : null}
        </form>
      )}
      <Link to="/listings" className="mt-6 inline-block text-sm underline">Back to listings</Link>
    </main>
  );
}
