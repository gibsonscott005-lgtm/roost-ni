import { describe, expect, it } from "vitest";
import { listingDeleteBlocked, removalPatch } from "./passport-files";

describe("passport file removal", () => {
  it("removing the ID clears the number and resets verification", () => {
    const { patch } = removalPatch("identity");
    expect(patch.id_document_number).toBeNull();
    expect(patch.id_document_path).toBeNull();
    expect(patch.verified_full_name).toBeNull();
    expect(patch.identity_verified).toBe(false);
    expect(patch.id_status).toBe("unverified");
  });
  it("removing income clears only its path", () => {
    expect(removalPatch("income").patch).toEqual({ income_document_path: null });
  });
});

describe("listing delete rule", () => {
  it("a landlord's own existing-tenancy record does not block", () => {
    expect(listingDeleteBlocked([{ tenant_id: null, status: "accepted", lease_status: "existing" }])).toBe(false);
  });
  it("a live applicant blocks", () => {
    expect(listingDeleteBlocked([{ tenant_id: "t", status: "pending", lease_status: null }])).toBe(true);
  });
  it("a withdrawn applicant does not block", () => {
    expect(listingDeleteBlocked([{ tenant_id: "t", status: "withdrawn", lease_status: null }])).toBe(false);
  });
  it("a counter-signed lease blocks", () => {
    expect(listingDeleteBlocked([{ tenant_id: null, status: "accepted", lease_status: "counter_signed" }])).toBe(true);
  });
});
