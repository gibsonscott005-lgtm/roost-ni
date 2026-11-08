import { test, expect } from "bun:test";
import { canOpenPassportDocuments } from "./src/lib/passport-access";
test("documents stay locked until a formal application", () => {
  expect(canOpenPassportDocuments({ tenant_id: "t", status: "pending", formal_application_at: null })).toBe(false);
  expect(canOpenPassportDocuments({ tenant_id: "t", status: "pending", formal_application_at: "2026-11-08T10:00:00Z" })).toBe(true);
});
test("withdrawn or declined applications never open documents", () => {
  expect(canOpenPassportDocuments({ tenant_id: "t", status: "withdrawn", formal_application_at: "2026-11-08T10:00:00Z" })).toBe(false);
  expect(canOpenPassportDocuments({ tenant_id: "t", status: "declined", formal_application_at: "2026-11-08T10:00:00Z" })).toBe(false);
});
