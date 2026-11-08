import { test, expect } from "bun:test";
import { tinReminderKind, registrationReminderKind } from "./src/lib/statutory-reminders";

const d = (s: string) => new Date(`${s}T09:00:00Z`);

test("notice reminder counts 28 days from the tenancy start", () => {
  const base = { startDate: "2026-11-01", tinGivenAt: null, leaseKind: "standard" };
  expect(tinReminderKind({ ...base, today: d("2026-11-08") })).toBe("tin_due:21");
  expect(tinReminderKind({ ...base, today: d("2026-11-28") })).toBe("tin_due:1");
  expect(tinReminderKind({ ...base, today: d("2026-11-29") })).toBe("tin_due:0");
  expect(tinReminderKind({ ...base, today: d("2026-11-10") })).toBeNull();
  expect(tinReminderKind({ ...base, today: d("2026-12-06") })).toBe("tin_passed:7");
});
test("notice reminder never fires for existing tenancies or once given", () => {
  expect(tinReminderKind({ startDate: "2026-11-01", tinGivenAt: null, leaseKind: "existing_agreement", today: d("2026-11-08") })).toBeNull();
  expect(tinReminderKind({ startDate: "2026-11-01", tinGivenAt: "2026-11-03", leaseKind: "standard", today: d("2026-11-08") })).toBeNull();
});
test("registration reminder: day 1, then every 30 days, stops once a number is saved", () => {
  expect(registrationReminderKind({ addedAt: "2026-11-01", regNumber: "", today: d("2026-11-02") })).toBe("landlord_reg:1");
  expect(registrationReminderKind({ addedAt: "2026-11-01", regNumber: "", today: d("2026-12-02") })).toBe("landlord_reg:31");
  expect(registrationReminderKind({ addedAt: "2026-11-01", regNumber: "", today: d("2026-11-15") })).toBeNull();
  expect(registrationReminderKind({ addedAt: "2026-11-01", regNumber: "LR123", today: d("2026-11-02") })).toBeNull();
});
