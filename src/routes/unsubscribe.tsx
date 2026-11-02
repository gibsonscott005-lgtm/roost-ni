import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { unsubscribeFromListingAlerts } from "@/lib/listing-alerts.functions";

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: z.object({ token: z.string().optional() }),
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

const isUuid = (t?: string) => !!t && /^[0-9a-f-]{36}$/i.test(t);

function UnsubscribePage() {
  const { token } = Route.useSearch();
  const unsubscribe = useServerFn(unsubscribeFromListingAlerts);
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");

  // Nothing happens on page load: only tapping the button removes the record,
  // so email link scanners can't unsubscribe anyone.
  const confirm = async () => {
    if (!token) return;
    setState("saving");
    try {
      await unsubscribe({ data: { token } });
      setState("done");
    } catch {
      setState("error");
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-2xl font-bold">Unsubscribe from listing alerts</h1>
      {!isUuid(token) ? (
        <p className="mt-4 text-sm">
          This link isn't complete. Use the unsubscribe link at the bottom of any RoostNI alert email.
        </p>
      ) : state === "done" ? (
        <p className="mt-4 text-sm">Done. You won't get any more new-listing emails from RoostNI.</p>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm">Stop receiving new-listing alert emails from RoostNI?</p>
          <button
            type="button"
            onClick={confirm}
            disabled={state === "saving"}
            className="h-10 w-full rounded-sm bg-foreground text-sm font-semibold text-[var(--color-primary-foreground)] disabled:opacity-60"
          >
            Unsubscribe
          </button>
          {state === "error" ? <p className="text-sm text-destructive">Couldn't do that just now. Please try again.</p> : null}
        </div>
      )}
      <Link to="/listings" className="mt-6 inline-block text-sm underline">Back to listings</Link>
    </main>
  );
}
