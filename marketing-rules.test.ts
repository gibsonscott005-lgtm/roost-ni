import { describe, expect, test } from "bun:test";
import { nextContentMode, prepareMarketingReview, validateMarketingCopy, readMarketingReview } from "./src/lib/marketing-knowledge";

const body = "Organise your rental evidence before a viewing. What has helped you prepare?";
describe("Robin marketing rules", () => {
  test("ten drafts approximate the requested 70/20/10 mix", () => {
    const modes = Array.from({ length: 10 }, (_, i) => nextContentMode(i));
    expect(modes.filter(m => m === "help")).toHaveLength(7);
    expect(modes.filter(m => m === "soft")).toHaveLength(2);
    expect(modes.filter(m => m === "direct")).toHaveLength(1);
  });
  test("pure help cannot mention RoostNI", () => {
    expect(() => prepareMarketingReview({ body: `RoostNI can help. ${body}` }, "help")).toThrow();
  });
  test.each(["free", "100%", "guaranteed", "100% compliant", "platform"])("rejects banned wording: %s", word => {
    expect(() => validateMarketingCopy(`${word}. ${body}`)).toThrow();
  });
  test("British organise is accepted and American organize rejected, including image text", () => {
    expect(() => validateMarketingCopy("Organise your evidence", false)).not.toThrow();
    expect(() => validateMarketingCopy("Organize your evidence", false)).toThrow();
  });
  test("Facebook is strictly under 150 words", () => {
    expect(() => validateMarketingCopy(Array(149).fill("Evidence").join(" ") + "?")).not.toThrow();
    expect(() => validateMarketingCopy(Array(150).fill("Evidence").join(" ") + "?")).toThrow();
  });
  test("allows four hashtags but not five", () => {
    expect(() => validateMarketingCopy(`#NI #Renting #Belfast #Bangor ${body}`)).not.toThrow();
    expect(() => validateMarketingCopy(`#NI #Renting #Belfast #Bangor #Ards ${body}`)).toThrow();
  });
  test("rejects a RoostNI is opening", () => {
    expect(() => validateMarketingCopy("RoostNI is built around NI tenancy rules. What do you think?")).toThrow();
  });
  test("requires the discussion question at the end", () => {
    expect(() => validateMarketingCopy(body + " #NI")).toThrow();
  });
  test("legal series requires a specific supported page and check flag", () => {
    expect(() => prepareMarketingReview({ body }, "help", true)).toThrow();
    expect(() => prepareMarketingReview({ body, legal_statements: [{ statement: body, source: "https://www.nidirect.gov.uk", flag: "check before posting" }] }, "help", true)).toThrow();
    const source = "https://www.nidirect.gov.uk/articles/protection-against-eviction";
    const facts = [{id:"example",topic:"Evidence",fact_text:body,source_url:source,last_verified_at:new Date().toISOString(),status:"approved",revision:1}];
    const review = prepareMarketingReview({ body, legal_statements: [{ statement: body, source, flag: "check before posting" }] }, "help", true, true, facts);
    expect(readMarketingReview(JSON.stringify(review))?.legal_statements[0]).toMatchObject({ statement: body, source, flag: "check before posting", fact_id:"example" });
  });
  test("agent fee claims are flagged for verification", () => {
    expect(prepareMarketingReview({ body: `Agent fees vary. ${body}` }, "help").review_flags).toContain("verify before posting");
  });
  test.each(["seeking", "bespoke", "portfolio", "premier", "stunning", "pursuant", "whilst", "hereby", "solutions", "leverage", "delighted to announce", "we are pleased to"])("bans corporate wording in posts, replies and images: %s", word => {
    expect(() => validateMarketingCopy(`${word}. ${body}`, false)).toThrow();
  });
  test("allows one emoji after the opening line, not two", () => {
    expect(() => validateMarketingCopy(`Paperwork again.\nKeep it together. 📁\nWhat works for you?`)).not.toThrow();
    expect(() => validateMarketingCopy(`Paperwork again.\nKeep it together. 📁 ✅\nWhat works for you?`)).toThrow();
  });
  test("no emoji in the first line, including a Northern Ireland flag", () => {
    expect(() => validateMarketingCopy(`📁 Paperwork again.\nWhat works for you?`)).toThrow();
    expect(() => validateMarketingCopy(`🇬🇧 Paperwork again.\nWhat works for you?`)).toThrow();
  });
  test("a joined emoji counts as one, not several symbols", () => {
    expect(() => validateMarketingCopy(`Paperwork again.\nKeep your evidence together. 👨‍👩‍👧\nWhat works for you?`)).not.toThrow();
  });
});