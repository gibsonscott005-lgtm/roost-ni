import { describe, expect, test } from "bun:test";
import { computeCoverRatio, landlordPassportView } from "./src/lib/passport-stage";

const row = {
  user_id: "t1", identity_verified: true, income_verified: false, reference_verified: false,
  id_document_number: "AB123", verified_date_of_birth: "1990-01-01", annual_income: 30000,
  monthly_income_net: 2000, income_breakdown: { employment_gross_annual: 30000 },
  previous_landlord_email: "pl@example.com", guarantor_name: "G", guarantor_phone: "077",
  id_document_path: "t1/identity/x.pdf",
};
const share = { id: "s1", status: "pending", formal_application_at: null as string | null, withdrawn_at: null };

describe("landlord passport stages", () => {
  test("before formal application: cover ratio only, no income, contacts or guarantor name", () => {
    const v = landlordPassportView(row, share, 1000);
    expect(v.cover_ratio).toBe(2.5);
    for (const k of ["monthly_income_net", "annual_income", "income_breakdown", "previous_landlord_email", "guarantor_name", "guarantor_phone"]) expect(v[k]).toBeUndefined();
  });
  test("after formal application on an active share: income and contacts released", () => {
    const v = landlordPassportView(row, { ...share, formal_application_at: "2026-11-10" }, 1000);
    expect(v.annual_income).toBe(30000);
    expect(v.previous_landlord_email).toBe("pl@example.com");
    expect(v.guarantor_phone).toBe("077");
  });
  test("withdrawn share after formal application falls back to summary", () => {
    const v = landlordPassportView(row, { ...share, status: "withdrawn", formal_application_at: "2026-11-10" }, 1000);
    expect(v.annual_income).toBeUndefined();
  });
  test("ID number, date of birth and file path never returned at any stage", () => {
    for (const f of [null, "2026-11-10"]) {
      const v = landlordPassportView(row, { ...share, formal_application_at: f }, 1000);
      expect(v.id_document_number).toBeUndefined();
      expect(v.verified_date_of_birth).toBeUndefined();
      expect(v.id_document_path).toBe("on file");
    }
  });
  test("cover ratio weights benefits 1.25x", () => {
    expect(computeCoverRatio({ universal_credit_annual: 12000 }, null, 500)).toBe(2.5);
  });
});
