/**
 * Client-safe constants and helpers for the identity verification flow.
 * No secrets, no provider SDKs — safe to import from components.
 */

export type VerificationMode = "simulated" | "test" | "live";

/** One-off tenant fee for a verified passport, in pence. Change here only. */
export const VERIFICATION_FEE_PENCE = 500;

export function formatFee(pence: number = VERIFICATION_FEE_PENCE): string {
  return `£${(pence / 100).toFixed(2).replace(/\.00$/, "")}`;
}

/** Roost never charges and never contacts a provider outside live mode. */
export function isChargeable(mode: VerificationMode): boolean {
  return mode === "live";
}

export interface VerificationConfig {
  mode: VerificationMode;
  feePence: number;
}

/**
 * A passport's identity state, reduced to the three things the UI cares about.
 * `verified` is only ever reachable through a provider result written server-side.
 */
export type IdentityTier = "none" | "self_certified" | "pending" | "failed" | "verified";

export function identityTier(p: {
  id_status?: string | null;
  id_document_path?: string | null;
}): IdentityTier {
  const s = p.id_status ?? "unverified";
  if (s === "verified") return "verified";
  if (s === "pending") return "pending";
  if (s === "failed") return "failed";
  if (s === "self_certified") return "self_certified";
  return p.id_document_path ? "self_certified" : "none";
}

/** True when the identity step has been satisfied one way or the other. */
export function identityComplete(p: {
  id_status?: string | null;
  id_document_path?: string | null;
}): boolean {
  const t = identityTier(p);
  return t === "verified" || t === "self_certified";
}