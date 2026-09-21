import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type OAuthNamespace = {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  denyAuthorization: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
};

interface AuthorizationDetails {
  client?: { name?: string | null } | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
}

function oauth(): OAuthNamespace {
  return (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s['authorization_id'] === "string" ? s['authorization_id'] : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/auth", search: { next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <Shell>
      <p className="text-sm text-muted-foreground">
        Could not load this authorisation request: {String((error as Error)?.message ?? error)}
      </p>
    </Shell>
  ),
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-resting">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-foreground text-[var(--color-primary-foreground)]">
            <Home className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <span className="font-display text-base font-semibold tracking-tight">
            Roost<span className="text-verified">NI</span>
          </span>
        </div>
        {children}
      </div>
    </main>
  );
}

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "an app";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect was returned by the authorisation server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <Shell>
      <h1 className="font-display text-xl font-semibold tracking-tight">
        Connect {clientName} to your RoostNI account
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {clientName} will be able to read your RoostNI data — listings, applications, tenancies,
        maintenance tickets and notifications — as you. You can disconnect it at any time.
      </p>
      {error ? (
        <p role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => decide(true)}
          className="flex-1 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] transition hover:bg-foreground/90 disabled:opacity-60"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => decide(false)}
          className="flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium transition hover:bg-secondary disabled:opacity-60"
        >
          Deny
        </button>
      </div>
    </Shell>
  );
}
