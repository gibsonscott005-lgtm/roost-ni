import { describe, expect, test as it } from "bun:test";
import { APPROVED_LINE, BILLING_NOTE, PLANS, SHORT_LINES, findBannedPhrases } from "./src/lib/plans-copy";
import { FOUNDING_PLAN, STANDARD_PLAN, TENANT_FEE_PENCE, monthlyPence } from "./src/lib/pricing";

describe("plans copy rules", () => {
  it("no plan is billing yet", () => {
    for (const p of PLANS) expect(p.status).toBe("not_billing");
  });
  it("approved wording contains no banned phrases", () => {
    expect(findBannedPhrases(APPROVED_LINE + BILLING_NOTE + Object.values(SHORT_LINES).join(" "))).toEqual([]);
  });
  it("old free-forever wording is banned", () => {
    expect(findBannedPhrases("Core tools are free forever. Free to list.")).toEqual([
      "free forever",
      "core tools are free",
      "free to list",
    ]);
  });
});

describe("pricing", () => {
  it("Standard: £7 first home, £4 each extra, capped at £59", () => {
    expect(monthlyPence(1, STANDARD_PLAN)).toBe(700);
    expect(monthlyPence(3, STANDARD_PLAN)).toBe(1500);
    expect(monthlyPence(20, STANDARD_PLAN)).toBe(5900);
  });
  it("Founding: £5 first home, £3 each extra, capped at £49, one month intro, 24-month lock", () => {
    expect(monthlyPence(1, FOUNDING_PLAN)).toBe(500);
    expect(monthlyPence(3, FOUNDING_PLAN)).toBe(1100);
    expect(monthlyPence(30, FOUNDING_PLAN)).toBe(4900);
    expect(FOUNDING_PLAN.introMonths).toBe(1);
    expect(FOUNDING_PLAN.lockMonths).toBe(24);
  });
  it("tenants never pay", () => {
    expect(TENANT_FEE_PENCE).toBe(0);
  });
});
