import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sendTenancyInvite } from "@/lib/tenancy-invite.functions";

/** Landlord invites the tenant of an existing tenancy by email (single-use link). */
export function TenantInviteCard({ shareId, defaultEmail, linked }: { shareId: string; defaultEmail?: string | null; linked: boolean }) {
  const send = useServerFn(sendTenancyInvite);
  const qc = useQueryClient();
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [busy, setBusy] = useState(false);
  const last = useQuery({
    queryKey: ["tenancy-invite", shareId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tenancy_invites")
        .select("email, created_at, expires_at, used_at, revoked_at")
        .eq("share_id", shareId)
        .order("created_at", { ascending: false })
        .limit(1);
      return data?.[0] ?? null;
    },
  });

  if (linked) {
    return (
      <div className="mt-4 rounded-lg border border-border p-4 text-sm">
        <p className="font-semibold">Tenant linked</p>
        <p className="mt-1 text-muted-foreground">Your tenant can see receipts, repairs and notices for this tenancy.</p>
      </div>
    );
  }
  const l = last.data;
  return (
    <div className="mt-4 rounded-lg border border-border p-4 text-sm">
      <p className="font-semibold">Invite your tenant</p>
      <p className="mt-1 text-muted-foreground">
        They get a single-use link (valid 14 days) to see receipts, repairs and notices. Tenants never pay anything.
      </p>
      <form
        className="mt-3 flex flex-wrap gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const r = await send({ data: { shareId, email } });
            if (r.sent) toast.success("Invite sent", { description: email });
            else toast.error("That address can't receive emails from RoostNI", { description: "Check it with your tenant." });
          } catch (err) {
            toast.error("Couldn't send the invite", { description: err instanceof Error ? err.message : "Please try again" });
          }
          setBusy(false);
          qc.invalidateQueries({ queryKey: ["tenancy-invite", shareId] });
        }}
      >
        <input
          type="email"
          required
          aria-label="Tenant's email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2"
          placeholder="tenant@email.com"
        />
        <button type="submit" disabled={busy} className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background disabled:opacity-60">
          {l && !l.used_at && !l.revoked_at ? "Send a new invite" : "Send invite"}
        </button>
      </form>
      {l && !l.used_at && !l.revoked_at ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Invite sent to {l.email} on {new Date(l.created_at).toLocaleDateString("en-GB")}
          {new Date(l.expires_at) < new Date() ? " — expired" : ""}. Sending a new one cancels the old link.
        </p>
      ) : null}
    </div>
  );
}
