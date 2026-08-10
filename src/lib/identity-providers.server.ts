/**
 * Identity verification providers behind one small interface.
 *
 * `simulated` needs no credentials and touches no network — it is the default
 * so the whole flow can be built, tested and demoed without spending anything.
 * `stripe` is the real implementation and is only reachable once
 * VERIFICATION_MODE is set to `test` or `live` and a key is present.
 *
 * Server-only: never import this from a component or a *.functions.ts module scope.
 */
import type { VerificationMode } from "./identity-verification";

export interface StartedCheck {
  /** Provider-side identifier we store on the passport and match webhooks against. */
  sessionId: string;
  /** Where to send the tenant. Null in simulated mode — the check happens in-app. */
  redirectUrl: string | null;
}

export interface CheckResult {
  outcome: "verified" | "failed";
  verifiedFullName: string | null;
  verifiedDateOfBirth: string | null;
  documentExpiry: string | null;
  failureReason: string | null;
}

export function getVerificationMode(): VerificationMode {
  const raw = (process.env["VERIFICATION_MODE"] ?? "simulated").toLowerCase();
  if (raw === "live" || raw === "test") {
    // Refuse to pretend we are live without a key — fall back to simulated
    // rather than throwing an opaque error at the tenant mid-flow.
    if (!process.env["STRIPE_SECRET_KEY"]) return "simulated";
    return raw;
  }
  return "simulated";
}

/**
 * Starts a check. In simulated mode this is a local no-op that mints an id;
 * the tenant resolves it from the in-app mock screen.
 */
export async function startCheck(args: {
  mode: VerificationMode;
  userId: string;
  email: string | null;
  returnUrl: string;
}): Promise<StartedCheck> {
  if (args.mode === "simulated") {
    return { sessionId: `sim_${crypto.randomUUID()}`, redirectUrl: null };
  }
  return startStripeCheck(args);
}

/**
 * Stripe Identity, with Checkout collecting the tenant fee first.
 * Called only in test/live mode. Uses the REST API directly — no SDK to bundle
 * into the worker, and nothing to install while we are still simulating.
 */
async function startStripeCheck(args: {
  userId: string;
  email: string | null;
  returnUrl: string;
}): Promise<StartedCheck> {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new Error("Verification provider is not configured.");

  const body = new URLSearchParams({
    type: "document",
    "metadata[user_id]": args.userId,
    "options[document][require_matching_selfie]": "true",
    "options[document][require_live_capture]": "true",
    return_url: args.returnUrl,
  });

  const res = await fetch("https://api.stripe.com/v1/identity/verification_sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    // Log provider detail server-side; the tenant gets a plain message.
    console.error("[identity] stripe session failed", res.status, await res.text());
    throw new Error("Verification is temporarily unavailable. Please try again shortly.");
  }

  const json = (await res.json()) as { id: string; url: string };
  return { sessionId: json.id, redirectUrl: json.url };
}

/** Builds the result row a simulated pass or fail writes. */
export function simulatedResult(
  outcome: "verified" | "failed",
  fallbackName: string | null,
): CheckResult {
  if (outcome === "failed") {
    return {
      outcome: "failed",
      verifiedFullName: null,
      verifiedDateOfBirth: null,
      documentExpiry: null,
      failureReason: "Simulated failure — the document photo could not be read.",
    };
  }
  return {
    outcome: "verified",
    verifiedFullName: fallbackName,
    verifiedDateOfBirth: null,
    documentExpiry: null,
    failureReason: null,
  };
}