/** Tenant invite rules. Pure and Worker-safe so they can be unit-tested. */
export const INVITE_DAYS = 14;

export interface InviteRow {
  email: string;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
}
export interface InviteShare {
  tenant_id: string | null;
  lease_kind: string | null;
  tenancy_status: string | null;
}

export type InviteRefusal = "not_found" | "used" | "revoked" | "expired" | "wrong_email" | "already_attached" | "not_existing";

export function normaliseEmail(v: string | null | undefined): string {
  return (v ?? "").trim().toLowerCase();
}

export function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 200;
}

export function inviteExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + INVITE_DAYS * 86_400_000);
}

export function checkInvite(
  invite: InviteRow | null,
  share: InviteShare | null,
  userEmail: string | null | undefined,
  userId: string,
  now: Date = new Date(),
): InviteRefusal | null {
  if (!invite || !share) return "not_found";
  if (invite.used_at) return "used";
  if (invite.revoked_at) return "revoked";
  if (new Date(invite.expires_at).getTime() <= now.getTime()) return "expired";
  if (normaliseEmail(invite.email) !== normaliseEmail(userEmail)) return "wrong_email";
  if (share.lease_kind !== "existing_agreement" || share.tenancy_status === "completed") return "not_existing";
  if (share.tenant_id && share.tenant_id !== userId) return "already_attached";
  return null;
}

export const REFUSAL_MESSAGE: Record<InviteRefusal, string> = {
  not_found: "This invite link isn't valid. Ask your landlord to send a new one.",
  used: "This invite has already been used. Ask your landlord to send a new one if you need it.",
  revoked: "Your landlord has cancelled this invite. Ask them to send a new one.",
  expired: "This invite has expired. Ask your landlord to send a new one.",
  wrong_email: "This invite was sent to a different email address. Sign in with the email the invite was sent to.",
  already_attached: "Another account is already linked to this tenancy. Ask your landlord for help.",
  not_existing: "This tenancy can no longer be joined. Ask your landlord for help.",
};

export async function hashToken(token: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function newToken(): string {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}
