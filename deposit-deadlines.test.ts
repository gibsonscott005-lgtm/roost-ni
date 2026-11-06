import { expect, test } from "bun:test";
import { depositDeadlines } from "./src/lib/deposit-deadlines";

test("protection due 28 days after the deposit is received", () => {
  expect(depositDeadlines("2026-11-01")!.protectBy.toISOString().slice(0, 10)).toBe("2026-11-29");
});
test("prescribed information due 35 days after the deposit is received", () => {
  expect(depositDeadlines("2026-11-01")!.prescribedInfoBy.toISOString().slice(0, 10)).toBe("2026-12-06");
});
test("no received date means no clock", () => {
  expect(depositDeadlines(null)).toBeNull();
});
test("deposits received before 1 April 2023 get no clock", () => {
  expect(depositDeadlines("2023-03-31")).toBeNull();
  expect(depositDeadlines("2023-04-01")).not.toBeNull();
});
