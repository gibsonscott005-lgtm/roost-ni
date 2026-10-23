import { describe, expect, test } from "bun:test";
import { prepareImageBrief } from "./marketing-knowledge";
const body = "Deposits in NI must not exceed one month's rent. Did you know that?";
describe("image brief", () => {
  test("headline of 8+ words is rejected", () => expect(() => prepareImageBrief({ headline: "one two three four five six seven eight", fact_line: "Did you know that?", layout: "" }, body)).toThrow());
  test("fact line not in post is rejected", () => expect(() => prepareImageBrief({ headline: "Deposit cap", fact_line: "Fines are £5,000.", layout: "" }, body)).toThrow());
  test("banned word in image text is rejected", () => expect(() => prepareImageBrief({ headline: "Free deposit help", fact_line: "Did you know that?", layout: "" }, body)).toThrow());
  test("American spelling rejected", () => expect(() => prepareImageBrief({ headline: "Get organized", fact_line: "Did you know that?", layout: "" }, body)).toThrow());
  test("valid brief includes style and exact text in prompt", () => {
    const b = prepareImageBrief({ headline: "One month. That's the cap.", fact_line: "Deposits in NI must not exceed one month's rent.", layout: "" }, body, true);
    expect(b.prompt).toContain("One month. That's the cap.");
    expect(b.style).toContain("hard black borders");
    expect(b.prompt).toContain("not legal advice");
  });
});
