/**
 * Signature verification and event parsing for provider identity callbacks.
 * Server-only. Nothing here runs while VERIFICATION_MODE is `simulated`.
 */

/** Constant-time comparison of two hex strings of equal length. */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verifies a Stripe `stripe-signature` header. Rejects signatures older than
 * five minutes so a captured callback cannot be replayed.
 */
export async function verifyStripeSignature(
  body: string,
  header: string,
  secret: string,
): Promise<boolean> {
  const parts = Object.fromEntries(
    header.split(",").map((kv) => {
      const i = kv.indexOf("=");
      return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
    }),
  ) as Record<string, string>;

  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;

  const expected = await hmacSha256Hex(secret, `${timestamp}.${body}`);
  return timingSafeEqualHex(signature, expected);
}

export interface IdentityEvent {
  userId: string;
  sessionId: string;
  outcome: "verified" | "failed";
  verifiedFullName: string | null;
  verifiedDateOfBirth: string | null;
  documentExpiry: string | null;
  failureReason: string | null;
}

interface StripeDobOrExpiry {
  day?: number;
  month?: number;
  year?: number;
}

function toIsoDate(d: StripeDobOrExpiry | undefined | null): string | null {
  if (!d?.year || !d.month || !d.day) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.year}-${pad(d.month)}-${pad(d.day)}`;
}

/** Maps a Stripe Identity event to our shape. Returns null for events we ignore. */
export function parseIdentityEvent(body: string): IdentityEvent | null {
  let payload: {
    type?: string;
    data?: {
      object?: {
        id?: string;
        metadata?: { user_id?: string };
        last_error?: { reason?: string; code?: string };
        verified_outputs?: {
          first_name?: string;
          last_name?: string;
          dob?: StripeDobOrExpiry;
          id_number?: string;
          expiration_date?: StripeDobOrExpiry;
        };
      };
    };
  };
  try {
    payload = JSON.parse(body);
  } catch {
    return null;
  }

  const obj = payload.data?.object;
  const userId = obj?.metadata?.user_id;
  const sessionId = obj?.id;
  if (!userId || !sessionId) return null;

  if (payload.type === "identity.verification_session.verified") {
    const out = obj?.verified_outputs;
    const name = [out?.first_name, out?.last_name].filter(Boolean).join(" ").trim();
    return {
      userId,
      sessionId,
      outcome: "verified",
      verifiedFullName: name || null,
      verifiedDateOfBirth: toIsoDate(out?.dob),
      documentExpiry: toIsoDate(out?.expiration_date),
      failureReason: null,
    };
  }

  if (payload.type === "identity.verification_session.requires_input") {
    return {
      userId,
      sessionId,
      outcome: "failed",
      verifiedFullName: null,
      verifiedDateOfBirth: null,
      documentExpiry: null,
      failureReason:
        obj?.last_error?.reason ?? "The check could not be completed. Please try again.",
    };
  }

  return null;
}