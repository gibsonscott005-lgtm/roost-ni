---
name: Self-certified tenant passport
description: tenant_passports self-certification schema + wizard, verification_audit_logs, landlord ID viewing via signIdDocumentUrl server fn, private tenant-documents bucket rules
type: feature
---
Roost does **not** perform background checks. All passport verification is tenant self-certification. User-facing copy must say "Self-Certified" (never "Verified by Roost") and include the disclaimer wherever verification is surfaced.

Schema (`public.tenant_passports`):
- `id_status` enum (includes `self_certified`), `id_verified_at`, `issuing_country`, `id_document_path` (private storage path)
- Booleans: `identity_verified`, `income_verified`, `reference_verified`, `right_to_rent_verified` — flipped true instantly on submission for this prototype
- References step supports `tenancy_duration`, `reference_document_path`

Wizard: `src/routes/_authenticated/dashboard.passport.edit.tsx` — 3 steps: Identity & Right to Rent (with issuing-country selector), Income, References (branch: First-Time Renter guarantor vs Experienced Renter with 3-year rule + optional 2nd landlord reference).

Every self-certification writes an immutable row to `public.verification_audit_logs` (append-only; RLS restricts reads).

**Landlord ID document viewing:** NEVER let the landlord browser client sign the URL — tenant-only RLS on `identity/` blocks it. Use `signIdDocumentUrl` server fn (`src/lib/identity-docs.functions.ts`) which verifies the landlord owns the listing referenced by the `passport_share`, then admin-signs a 60s URL.

Bucket `tenant-documents` is `public=false`; anon access fully blocked. iOS Safari PDF uploads must go via `arrayBuffer()` — streaming form uploads fail with "Failed to fetch".

**How to apply:** any new passport field must persist via `.upsert({ user_id }, { onConflict: 'user_id' })` and be gated behind the auth-loading spinner in the wizard/dashboard to avoid remount data-loss.
