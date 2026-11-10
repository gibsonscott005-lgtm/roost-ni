/**
 * Existing-tenant details live in the owner-only property_tenancy_records
 * table. Queries embed it as `rec:property_tenancy_records(...)`; this copies
 * the fields back onto the listing object so callers keep the same shape.
 */
export const TENANCY_RECORD_EMBED =
  "rec:property_tenancy_records(existing_tenant_name, existing_tenant_email, existing_deposit_reference)";

type Rec = { existing_tenant_name?: string | null; existing_tenant_email?: string | null; existing_deposit_reference?: string | null };

export function withTenancyRecord<T extends Record<string, unknown>>(listing: T | null | undefined) {
  if (!listing) return listing ?? null;
  const raw = (listing as { rec?: Rec | Rec[] | null }).rec;
  const rec = Array.isArray(raw) ? raw[0] : raw;
  return {
    ...listing,
    existing_tenant_name: rec?.existing_tenant_name ?? null,
    existing_tenant_email: rec?.existing_tenant_email ?? null,
    existing_deposit_reference: rec?.existing_deposit_reference ?? null,
  };
}
