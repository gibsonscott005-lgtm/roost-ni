import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { VerificationConfig } from "./identity-verification";
import { VERIFICATION_FEE_PENCE } from "./identity-verification";

/** Lets the tenant UI know whether it is looking at a real check or a simulation. */
export const getVerificationConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<VerificationConfig> => {
    const { getVerificationMode } = await import("./identity-providers.server");
    return { mode: getVerificationMode(), feePence: VERIFICATION_FEE_PENCE };
  });

/**
 * Opens a verification attempt. Marks the passport pending and returns where to
 * send the tenant — a provider-hosted page in live mode, or nowhere in
 * simulated mode, where the check is resolved from the in-app mock screen.
 */
export const startVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { returnPath?: string }) => {
    // The client may only name an in-app path; the server turns it into an
    // absolute URL on the request's own origin, so a provider can never be
    // handed a caller-chosen external destination.
    const path =
      typeof data?.returnPath === "string" && data.returnPath.length > 0
        ? data.returnPath
        : "/dashboard/passport/edit";
    if (path.length > 300 || !/^\/(?!\/)[^\s\\]*$/.test(path)) {
      throw new Error("Invalid return path");
    }
    return { returnPath: path };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { getVerificationMode, startCheck } = await import("./identity-providers.server");
    const mode = getVerificationMode();

    const request = getRequest();
    const origin = request
      ? new URL(request.url).origin
      : (process.env["PUBLIC_APP_URL"] ?? "https://roostni.co.uk");

    const started = await startCheck({
      mode,
      userId,
      email: ((context.claims as Record<string, unknown> | undefined)?.["email"] as string | undefined) ?? null,
      returnUrl: `${origin}${data.returnPath}`,
    });

    const { error } = await supabase
      .from("tenant_passports")
      .upsert(
        {
          user_id: userId,
          id_status: "pending",
          id_provider: mode === "simulated" ? "simulated" : "stripe",
          id_session_id: started.sessionId,
          id_failure_reason: null,
        },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);

    await supabase.from("verification_audit_logs").insert({
      tenant_id: userId,
      provider: mode === "simulated" ? "simulated" : "stripe",
      session_id: started.sessionId,
      event_type: "verification_started",
      payload: { mode, at: new Date().toISOString() },
    });

    return { mode, sessionId: started.sessionId, redirectUrl: started.redirectUrl };
  });

/**
 * Resolves a SIMULATED check. Hard-refuses outside simulated mode, so a
 * browser can never mint a real "verified" status.
 */
export const resolveSimulatedVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { getVerificationMode, simulatedResult } = await import("./identity-providers.server");
    const mode = getVerificationMode();
    if (mode !== "simulated") {
      throw new Error("Simulated results are not accepted while a real provider is connected.");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();

    const { data: existing } = await supabase
      .from("tenant_passports")
      .select("id_status, id_session_id, id_document_type, id_document_path")
      .eq("user_id", userId)
      .maybeSingle();

    // A check must have been started first — the outcome is resolved against
    // the session the server opened, never minted from nothing.
    if (!existing || existing.id_status !== "pending" || !existing.id_session_id) {
      throw new Error("Start the identity check before resolving it.");
    }

    // The caller never chooses the outcome: the simulated check passes only
    // when the passport on file actually carries an identity document, mirroring
    // what a real provider would inspect.
    const hasDocument = Boolean(existing.id_document_type && existing.id_document_path);
    const outcome: "verified" | "failed" = hasDocument ? "verified" : "failed";

    const sessionId = existing.id_session_id;
    const result = simulatedResult(outcome, profile?.full_name ?? null);
    if (outcome === "failed") {
      result.failureReason =
        "Simulated failure — add an identity document to your passport before running the check.";
    }
    const now = new Date().toISOString();

    // Only the server may record a verified outcome — the database blocks
    // signed-in users from setting it directly.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: saved, error } = await supabaseAdmin
      .from("tenant_passports")
      .upsert(
        {
          user_id: userId,
          id_status: result.outcome,
          id_provider: "simulated",
          id_session_id: sessionId,
          id_verified_at: result.outcome === "verified" ? now : null,
          identity_verified: result.outcome === "verified",
          verified_full_name: result.verifiedFullName,
          verified_date_of_birth: result.verifiedDateOfBirth,
          id_document_expiry: result.documentExpiry,
          id_failure_reason: result.failureReason,
        },
        { onConflict: "user_id" },
      )
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("verification_audit_logs").insert({
      tenant_id: userId,
      provider: "simulated",
      session_id: sessionId,
      event_type:
        result.outcome === "verified" ? "verification_passed" : "verification_failed",
      payload: {
        simulated: true,
        outcome: result.outcome,
        reason: result.failureReason,
        at: now,
      },
    });

    return { outcome: result.outcome, passport: saved };
  });