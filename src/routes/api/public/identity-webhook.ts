/**
 * Provider callback for identity checks.
 *
 * Inert while VERIFICATION_MODE is `simulated` (the default) — it answers 503
 * and writes nothing, so there is no unauthenticated path into passport status
 * while we are testing for free. Once a provider is connected, this is the ONLY
 * place a `verified` status is written.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/identity-webhook")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { getVerificationMode } = await import("@/lib/identity-providers.server");
        if (getVerificationMode() === "simulated") {
          return new Response("Verification provider not connected", { status: 503 });
        }

        const secret = process.env["STRIPE_WEBHOOK_SECRET"];
        if (!secret) return new Response("Not configured", { status: 503 });

        const signature = request.headers.get("stripe-signature") ?? "";
        const body = await request.text();
        const { verifyStripeSignature, parseIdentityEvent } = await import(
          "@/lib/identity-webhook.server"
        );
        if (!(await verifyStripeSignature(body, signature, secret))) {
          return new Response("Invalid signature", { status: 401 });
        }

        const event = parseIdentityEvent(body);
        if (!event) return new Response("ok");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = new Date().toISOString();

        await supabaseAdmin
          .from("tenant_passports")
          .update({
            id_status: event.outcome,
            id_provider: "stripe",
            id_verified_at: event.outcome === "verified" ? now : null,
            identity_verified: event.outcome === "verified",
            verified_full_name: event.verifiedFullName,
            verified_date_of_birth: event.verifiedDateOfBirth,
            id_document_expiry: event.documentExpiry,
            id_failure_reason: event.failureReason,
          })
          .eq("user_id", event.userId);

        await supabaseAdmin.from("verification_audit_logs").insert({
          tenant_id: event.userId,
          provider: "stripe",
          session_id: event.sessionId,
          event_type:
            event.outcome === "verified" ? "verification_passed" : "verification_failed",
          payload: { outcome: event.outcome, reason: event.failureReason, at: now },
        });

        return new Response("ok");
      },
    },
  },
});