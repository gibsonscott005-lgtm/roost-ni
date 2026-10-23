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
describe("image brief grounding", () => {
  const travel = "Would that journey still suit you on a wet Tuesday? I'd check the journey at the time you'd actually travel. Good practice: compare weekday and weekend timetables. Which journey would you test?";
  test("summary headline and good-practice label from the post are accepted", () => {
    expect(prepareImageBrief({ headline: "TEST THE JOURNEY", fact_line: "Good practice: check your actual travel times." }, travel).source_line).toBeNull();
  });
  test("unrelated image text is still rejected", () => expect(() => prepareImageBrief({ headline: "BOILER SERVICE DUE", fact_line: "Book an engineer before winter" }, travel)).toThrow());
  test("digits match an approved fact written in words", () => {
    const cap = { statement: "Tenancy deposits must not exceed one month's rent.", source: "https://www.nidirect.gov.uk/articles/x", flag: "check before posting" as const };
    expect(prepareImageBrief({ headline: "1 MONTH", fact_line: "maximum tenancy deposit" }, cap.statement, [cap]).source_line).toBe("Source: nidirect.gov.uk");
  });
});
