import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { posthog } from "@/integrations/posthog/client";
import { acceptTenancyInvite } from "@/lib/tenancy-invite.functions";

export const Route = createFileRoute("/invite")({
  staticData: { sitemap: false },
  validateSearch: (s: Record<string, unknown>): { token?: string } =>
    typeof s.token === "string" && /^[0-9a-f]{64}$/.test(s.token) ? { token: s.token } : {},
  head: () => ({
    meta: [
      { title: "Your tenancy invite — RoostNI" },
      { name: "description", content: "Join your tenancy on RoostNI to see rent receipts, repairs and notices." },
      { property: "og:title", content: "Your tenancy invite — RoostNI" },
      { property: "og:description", content: "Join your tenancy on RoostNI to see rent receipts, repairs and notices." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const accept = useServerFn(acceptTenancyInvite);
  const [state, setState] = useState<"checking" | "signed_out" | "joining" | "error">("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("This invite link isn't valid. Ask your landlord to send a new one.");
      return;
    }
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      if (!data.session) return setState("signed_out");
      setState("joining");
      try {
        const res = await accept({ data: { token } });
        if (cancelled) return;
        if (res.ok) {
          posthog.capture("tenant_invite_accepted");
          navigate({ to: "/tenant/tenancy", search: { share: res.shareId } as never });
        } else {
          setState("error");
          setMessage(res.message);
        }
      } catch {
        setState("error");
        setMessage("Something went wrong. Please try the link again.");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token, accept, navigate]);

  const next = `/invite?token=${token ?? ""}`;
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <p className="font-mono text-sm font-bold uppercase tracking-wider text-verified">// Tenancy invite</p>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight">Join your tenancy on RoostNI</h1>
        {state === "signed_out" ? (
          <>
            <p className="mt-4 leading-relaxed">
              See your rent receipts, repairs and notices in one place. It costs tenants nothing. Use the email address
              the invite was sent to.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/auth" search={{ role: "tenant", next }} className="border-2 border-foreground bg-foreground px-4 py-2 font-semibold text-background">
                Create a tenant account
              </Link>
              <Link to="/auth" search={{ role: "tenant", next, mode: "login" }} className="border-2 border-foreground px-4 py-2 font-semibold">
                I already have an account
              </Link>
            </div>
          </>
        ) : state === "error" ? (
          <p role="alert" className="mt-4 border-2 border-foreground p-4 leading-relaxed">{message}</p>
        ) : (
          <p className="mt-4 text-muted-foreground">Linking your account…</p>
        )}
      </main>
    </div>
  );
}
