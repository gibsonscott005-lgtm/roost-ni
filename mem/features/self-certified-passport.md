---
name: Self-certified tenant passport
description: tenant_passports identity tiers (verified vs self-certified) + wizard, paid identity checks, verification_audit_logs, landlord ID viewing via signIdDocumentUrl server fn, private tenant-documents bucket rules
type: feature
---
Roost does **not** perform background checks, references or credit checks. The **one exception** is identity: a tenant can pay for a real document-authenticity + face-match check, and only that claim may use the word "Verified". Everything else is tenant self-certification and must read "Self-Certified", "Declared" or "Evidence attached".

**Right to Rent does not exist in Roost.** The scheme is England-only and has never applied in Northern Ireland. The `right_to_rent_verified` column was dropped; never reintroduce the field or the phrase.

Schema (`public.tenant_passports`):
- `id_status` enum: `unverified | self_certified | pending | verified | failed`; plus `id_verified_at`, `id_provider`, `id_session_id`, `issuing_country`, `id_document_path` (private storage path)
- Provider-returned fields (only ever written server-side): `verified_full_name`, `verified_date_of_birth`, `id_document_expiry`, `id_failure_reason`, `verification_fee_paid_at`
- Booleans: `identity_verified`, `income_verified`, `reference_verified`
- References step supports `tenancy_duration`, `reference_document_path`

Wizard: `src/routes/_authenticated/dashboard.passport.edit.tsx` — 3 steps: Identity (paid check panel + document upload with issuing-country selector), Income, References (branch: First-Time Renter guarantor vs Experienced Renter with 3-year rule + optional 2nd landlord reference).

**Identity verification.** Tenant pays, once, and it carries across every application. `VERIFICATION_MODE` env selects the provider: `simulated` (default — no keys, no charge, in-app pass/fail buttons) or `stripe`. Logic lives in `src/lib/identity-verification.ts` (client-safe tiers/fee), `src/lib/identity-providers.server.ts` (provider adapters), `src/lib/identity-verification.functions.ts` (server fns), and `src/routes/api/public/identity-webhook.ts` (signature-verified callback, inert in simulated mode). A `verified` status may ONLY be written by the webhook or the simulated resolver, never by the browser.

Every self-certification writes an immutable row to `public.verification_audit_logs` (append-only; RLS restricts reads).

**Landlord ID document viewing:** NEVER let the landlord browser client sign the URL — tenant-only RLS on `identity/` blocks it. Use `signIdDocumentUrl` server fn (`src/lib/identity-docs.functions.ts`) which verifies the landlord owns the listing referenced by the `passport_share`, then admin-signs a 60s URL.

Bucket `tenant-documents` is `public=false`; anon access fully blocked. iOS Safari PDF uploads must go via `arrayBuffer()` — streaming form uploads fail with "Failed to fetch".

**How to apply:** any new passport field must persist via `.upsert({ user_id }, { onConflict: 'user_id' })` and be gated behind the auth-loading spinner in the wizard/dashboard to avoid remount data-loss.
