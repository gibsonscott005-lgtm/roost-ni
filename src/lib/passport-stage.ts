/**
 * What a landlord may see of an applicant's passport at each stage.
 * Before a formal application: flags and a server-calculated income cover
 * ratio only. After a formal application on an active share: exact income and
 * contact details. The ID document number is never part of either view.
 */
export type IncomeBreakdown = {
  employment_gross_annual?: number;
  universal_credit_annual?: number;
  housing_element_annual?: number;
  disability_benefits_annual?: number;
  other_benefits_annual?: number;
} | null;

export function computeCoverRatio(
  breakdown: IncomeBreakdown,
  annualIncome: number | null | undefined,
  monthlyRent: number | null | undefined,
): number | null {
  if (!monthlyRent || monthlyRent <= 0) return null;
  const n = (v: unknown) => Number(v ?? 0) || 0;
  const employment = n(breakdown?.employment_gross_annual);
  const benefits =
    n(breakdown?.universal_credit_annual) +
    n(breakdown?.housing_element_annual) +
    n(breakdown?.disability_benefits_annual) +
    n(breakdown?.other_benefits_annual);
  let effective = employment + benefits * 1.25;
  if (effective <= 0) effective = n(annualIncome);
  if (effective <= 0) return null;
  return Math.round((effective / (monthlyRent * 12)) * 10) / 10;
}

export type ShareStage = {
  formal_application_at: string | null;
  status: string | null;
  withdrawn_at?: string | null;
};

export function isFormalStage(share: ShareStage): boolean {
  return (
    !!share.formal_application_at &&
    !share.withdrawn_at &&
    !["withdrawn", "declined", "rejected"].includes(share.status ?? "")
  );
}

export const SUMMARY_FIELDS = [
  "identity_verified",
  "income_verified",
  "reference_verified",
  "id_status",
  "id_verified_at",
  "employment_status",
  "willing_direct_payment_apa",
  "is_first_time_renter",
  "preferred_heating",
  "accept_empty_in_full_out",
] as const;

export const FORMAL_FIELDS = [
  "monthly_income_net",
  "annual_income",
  "income_breakdown",
  "issuing_country",
  "previous_landlord_name",
  "previous_landlord_email",
  "previous_landlord_phone",
  "tenancy_start_date",
  "tenancy_end_date",
  "previous_landlord_name_2",
  "previous_landlord_email_2",
  "previous_landlord_phone_2",
  "tenancy_start_date_2",
  "tenancy_end_date_2",
  "guarantor_name",
  "guarantor_address",
  "guarantor_email",
  "guarantor_phone",
  "guarantor_employment_status",
] as const;

/** Never returned to a landlord, at any stage. */
export const NEVER_TO_LANDLORD = ["id_document_number", "verified_date_of_birth", "verified_full_name", "id_session_id"] as const;

export function landlordPassportView(
  row: Record<string, unknown>,
  share: ShareStage & { id: string },
  monthlyRent: number | null,
) {
  const formal = isFormalStage(share);
  const out: Record<string, unknown> = { user_id: row.user_id, share_id: share.id, formal_stage: formal };
  for (const k of SUMMARY_FIELDS) out[k] = row[k] ?? null;
  out.cover_ratio = computeCoverRatio(row.income_breakdown as IncomeBreakdown, row.annual_income as number | null, monthlyRent);
  // Existence flags only; storage paths never leave the server.
  out.id_document_path = row.id_document_path ? "on file" : null;
  out.income_document_path = row.income_document_path ? "on file" : null;
  out.reference_document_on_file = !!row.reference_document_path;
  out.income_provided = !!row.income_document_path;
  out.reference_provided = !!row.reference_document_path || (!!row.is_first_time_renter && !!row.guarantor_name);
  if (formal) for (const k of FORMAL_FIELDS) out[k] = row[k] ?? null;
  return out;
}
