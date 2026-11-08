/** Landlords open passport document files only on an active, formal application. Before that: figures and references only. */
export function canOpenPassportDocuments(share: { tenant_id: string | null; status: string; formal_application_at: string | null }): boolean {
  return !!share.tenant_id && !!share.formal_application_at && ["pending", "reviewed", "accepted"].includes(share.status);
}
