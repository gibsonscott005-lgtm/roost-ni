import { describe, expect, test } from "bun:test";
import { prepareImageBrief, auditImageBrief } from "./src/lib/marketing-knowledge";
const fact = { statement: "Deposits must be protected within 28 days.", source: "https://www.nidirect.gov.uk/articles/tenancy-deposit-scheme", flag: "check before posting" as const };
const body = "Deposits must be protected within 28 days. Keep your paperwork in one folder. Did you know that?";
describe("image brief", () => {
  test("headline of 8+ words is rejected", () => expect(() => prepareImageBrief({ headline: "one two three four five six seven eight", fact_line: "one folder" }, body)).toThrow());
  test("approved fact gives source line from its domain", () => {
    const b = prepareImageBrief({ headline: "28 DAYS", fact_line: "to protect a tenant's deposit in an approved scheme" }, body, [fact]);
    expect(b.source_line).toBe("Source: nidirect.gov.uk");
    expect(b.prompt).toContain("Do not add any other text.");
    expect(b.prompt).toContain("No website UI elements");
  });
  test("legal figure without approved fact is rejected", () => expect(() => prepareImageBrief({ headline: "28 DAYS", fact_line: "to protect a deposit" }, body, [])).toThrow());
  test("deposit cap without approved fact is rejected", () => expect(() => prepareImageBrief({ headline: "ONE MONTH", fact_line: "deposit cap in NI" }, body, [fact])).toThrow());
  for (const bad of ["No tax worries", "Rent control explained", "Zero commission", "0% commission", "Compliance tools", "Cut out the middleman", "Guaranteed homes"]) {
    test(`banned on image: ${bad}`, () => expect(() => prepareImageBrief({ headline: bad, fact_line: "Keep your paperwork in one folder" }, body)).toThrow());
  }
  test("US spelling rejected", () => expect(() => prepareImageBrief({ headline: "Get organized", fact_line: "Keep your paperwork in one folder" }, body)).toThrow());
  test("plain non-legal fact from post is allowed without source", () => {
    const b = prepareImageBrief({ headline: "ONE FOLDER", fact_line: "Keep your paperwork in one folder" }, body);
    expect(b.source_line).toBeNull();
  });
  test("audit blocks banned wording in saved brief", () => expect(auditImageBrief({ headline: "Free help", fact_line: "x", style: "", prompt: "Do not add any other text." }).length).toBeGreaterThan(0));
});
