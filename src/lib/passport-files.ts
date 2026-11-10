export type PassportFileKind = "identity" | "income" | "reference";

/** Fields cleared when a tenant removes a passport file. */
export function removalPatch(kind: PassportFileKind): { pathColumn: string; patch: Record<string, unknown> } {
  if (kind === "income") return { pathColumn: "income_document_path", patch: { income_document_path: null } };
  if (kind === "reference") return { pathColumn: "reference_document_path", patch: { reference_document_path: null } };
  return {
    pathColumn: "id_document_path",
    patch: {
      id_document_path: null,
      id_document_number: null,
      id_document_type: null,
      id_document_expiry: null,
      issuing_country: null,
      verified_full_name: null,
      verified_date_of_birth: null,
      identity_verified: false,
      id_status: "unverified",
      id_verified_at: null,
      id_provider: null,
      id_session_id: null,
      id_failure_reason: null,
    },
  };
}

/** A listing can be deleted unless a real applicant or a signed lease is attached. */
export function listingDeleteBlocked(
  shares: { tenant_id: string | null; status: string; lease_status: string | null }[],
): boolean {
  const ended = ["withdrawn", "declined", "rejected"];
  return shares.some(
    (s) => s.lease_status === "counter_signed" || (s.tenant_id !== null && !ended.includes(s.status)),
  );
}
