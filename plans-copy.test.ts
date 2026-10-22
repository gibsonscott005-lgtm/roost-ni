import { describe, expect, test as it } from "bun:test";
import { APPROVED_LINE, PLANS, SHORT_LINES, findBannedPhrases } from "./src/lib/plans-copy";
import { MARKETING_KNOWLEDGE } from "./src/lib/marketing-knowledge";

describe("plans copy rules", () => {
  it("only the core plan is live, and planned services have no price", () => {
    for (const p of PLANS) {
      if (p.id === "core") expect(p).toMatchObject({ status: "live", price: 0 });
      else expect(p).toMatchObject({ status: "planned", price: null });
    }
  });
  it("approved wording contains no banned phrases", () => {
    expect(findBannedPhrases(APPROVED_LINE + Object.values(SHORT_LINES).join(" "))).toEqual([]);
  });
  it("Robin's knowledge uses the approved line", () => {
    expect(MARKETING_KNOWLEDGE).toContain(APPROVED_LINE);
  });
});
