import { describe, expect, it } from "vitest";
import { daysSinceAdded, isReminderDay, tenancyChecklist } from "./tenancy-completeness";

const empty = {
  tenancy_start_date: null, monthly_rent: null, rent_frequency: null, deposit: null,
  deposit_received_at: null, deposit_scheme: null, deposit_protected_at: null,
  tenant_name: null, tenant_email: null, tenant_phone: null, tin_given_at: null,
  ni_landlord_reg_number: "Pending",
};

describe("tenanted records checklist", () => {
  it("has 11 must-complete items and a 'Pending' registration number is not done", () => {
    const list = tenancyChecklist(empty);
    expect(list).toHaveLength(11);
    expect(list.filter((i) => i.done)).toHaveLength(0);
  });
  it("phone alone counts as contact details", () => {
    const list = tenancyChecklist({ ...empty, tenant_phone: "07700900000" });
    expect(list.find((i) => i.key === "contact")!.done).toBe(true);
  });
});

describe("reminder schedule", () => {
  it("sends on days 3, 7 and 10, then weekly", () => {
    const days = Array.from({ length: 32 }, (_, d) => d).filter(isReminderDay);
    expect(days).toEqual([3, 7, 10, 17, 24, 31]);
  });
  it("counts calendar days from the day the home was added", () => {
    expect(daysSinceAdded("2026-11-01T23:00:00Z", new Date("2026-11-04T01:00:00Z"))).toBe(3);
  });
});
