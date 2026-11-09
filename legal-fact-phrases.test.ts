import { describe, it, expect } from "bun:test";
import { assertApprovedStatements, type LegalFact } from "./src/lib/legal-fact-rules";
const fact: LegalFact = { id:"f1", topic:"deposit_protection", fact_text:"A landlord must protect a deposit within 28 days of receiving it.", source_url:"https://www.nidirect.gov.uk/x", last_verified_at:new Date().toISOString(), status:"approved", revision:1 };
describe("Robin legal wording check", () => {
  it("allows the product phrase 'statutory tools'", () => {
    expect(() => assertApprovedStatements("Statutory tools built around NI tenancy rules.", [], [])).not.toThrow();
  });
  it("still blocks a bare 'statutory' claim", () => {
    expect(() => assertApprovedStatements("This is a statutory duty.", [], [])).toThrow();
  });
  it("allows 'deposit protection' in the title when the matching fact is attached", () => {
    const body = `Separating deposit protection and information deadlines\n${fact.fact_text}`;
    expect(() => assertApprovedStatements(body, [{ statement:fact.fact_text, source:fact.source_url }], [fact])).not.toThrow();
  });
  it("blocks 'deposit protection' without an attached fact", () => {
    expect(() => assertApprovedStatements("Think about deposit protection.", [], [fact])).toThrow();
  });
});
