import { describe, expect, it } from "vitest";
import { checkInvite, hashToken, inviteExpiry, newToken } from "./src/lib/tenancy-invite";

const now = new Date("2026-11-08T12:00:00Z");
const invite = { email: "Tenant@Example.com", expires_at: inviteExpiry(now).toISOString(), used_at: null, revoked_at: null };
const share = { tenant_id: null, lease_kind: "existing_agreement", tenancy_status: "active" };

describe("tenant invite rules", () => {
  it("accepts the invited email, ignoring case and spaces", () =>
    expect(checkInvite(invite, share, " tenant@example.com ", "u1", now)).toBeNull());
  it("is single-use", () => expect(checkInvite({ ...invite, used_at: now.toISOString() }, share, "tenant@example.com", "u1", now)).toBe("used"));
  it("expires after 14 days", () =>
    expect(checkInvite(invite, share, "tenant@example.com", "u1", new Date(now.getTime() + 14 * 86_400_000))).toBe("expired"));
  it("refuses a different email", () => expect(checkInvite(invite, share, "other@example.com", "u1", now)).toBe("wrong_email"));
  it("refuses a tenancy already linked to someone else", () =>
    expect(checkInvite(invite, { ...share, tenant_id: "u2" }, "tenant@example.com", "u1", now)).toBe("already_attached"));
  it("refuses an ended tenancy", () =>
    expect(checkInvite(invite, { ...share, tenancy_status: "completed" }, "tenant@example.com", "u1", now)).toBe("not_existing"));
  it("stores only a hash of the token", async () => {
    const t = newToken();
    expect(t).toHaveLength(64);
    expect(await hashToken(t)).not.toBe(t);
  });
});
