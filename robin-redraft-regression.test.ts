import { expect, test } from "bun:test";
import { assertApprovedStatements } from "./src/lib/legal-fact-rules";
import { groundedInBody } from "./src/lib/marketing-knowledge";

test("'not an extra legal requirement' disclaimer is accepted", () => {
  expect(() => assertApprovedStatements("That filing suggestion is good practice, not an extra legal requirement.", [], [])).not.toThrow();
});
test("real legal claim still blocked", () => {
  expect(() => assertApprovedStatements("Landlords have a legal requirement to register.", [], [])).toThrow();
});
test("'digging' grounds against 'dig' in the post", () => {
  expect(groundedInBody("INBOX DIGGING keep registration records together", "A named folder beats a dig through your inbox. Keep the registration record handy.")).toBe(true);
});
test("unrelated image text still rejected", () => {
  expect(groundedInBody("CHEAP HOLIDAY FLIGHTS SPAIN", "Keep the registration record in a named folder.")).toBe(false);
});
