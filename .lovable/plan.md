## Tenant Passport Verification Wizard

Build a 3-step wizard at `/dashboard/passport/edit` that lets a tenant submit identity, income, and reference details (with document uploads to a private bucket) and instantly flips their verification flags so the tenant card and landlord inbox light up emerald.

### 1. Backend setup

**Storage bucket (`tenant_documents`, private)**
- Created via the `storage_create_bucket` tool (Lovable Cloud rejects direct `INSERT INTO storage.buckets`). Public = false.
- File size limit and MIME restrictions applied via a follow-up migration on `storage.buckets` (allowed: `image/jpeg`, `image/png`, `application/pdf`; 10 MB cap).

**Storage RLS on `storage.objects`** — tenant scoped by first folder segment = `auth.uid()`:
- INSERT, SELECT, DELETE policies for `authenticated` where `bucket_id = 'tenant_documents' AND (storage.foldername(name))[1] = auth.uid()::text`.
- Landlords never read raw documents — they only see the boolean flags.

**Extend `public.tenant_passports`** (single migration, additive):
- `id_document_type` text (check: `passport` | `driving_licence`)
- `id_document_number` text
- `id_document_path` text
- `employment_status` text
- `annual_income` numeric
- `income_document_path` text
- `previous_landlord_name` / `_email` / `_phone` text

RLS on `tenant_passports` already scopes rows to `auth.uid()`; the migration will assert that policy exists (create if missing) and re-confirm `ENABLE ROW LEVEL SECURITY`. Existing `GRANT`s remain.

### 2. Route: `src/routes/_authenticated/dashboard.passport.edit.tsx`

Three-step wizard inside the standard dashboard shell:

```text
[ 1 Identity & Right to Rent ] — [ 2 Income ] — [ 3 References ]
```

- Numbered stepper at the top — completed = filled emerald, current = outlined emerald, future = muted slate.
- Each step is a single white card on the `#eef2f7` canvas, rounded-3xl, soft shadow.
- Buttons: `Back`, `Save progress` (persists the step + flips its flag), `Continue`.
- **Step 1 — Identity & Right to Rent**: document type select, document number, image/PDF dropzone. On save: upload to `tenant_documents/{uid}/identity/...`, store path, set `identity_verified = true` AND `right_to_rent_verified = true` (prototype shortcut as requested).
- **Step 2 — Income**: employment status select, annual income (£), payslip/tax-summary upload. On save: store path, set `monthly_income_net = annual_income / 12`, flip `income_verified = true`.
- **Step 3 — References**: previous landlord name, email, phone. On save: flip `reference_verified = true` and redirect to `/` with a success toast.

Dropzones: dashed slate border, emerald on drag/hover, filename + size after upload, "Replace" link. Validation client + server with Zod. British English copy ("Driving Licence", "Save progress").

### 3. Server functions — `src/lib/passport.functions.ts`

All `.middleware([requireSupabaseAuth])`:
- `getMyPassport()` — returns the tenant's row, creating it on first call.
- `saveIdentityStep({ docType, docNumber, docPath })`
- `saveIncomeStep({ employmentStatus, annualIncome, docPath })`
- `saveReferencesStep({ name, email, phone })`

Uploads happen client-side via the browser Supabase client (RLS already scopes by `auth.uid()` folder prefix); only the resulting object path is sent to the server fn. Each save returns the updated row; client invalidates `['passport']`.

### 4. UI sync

- Home (`/`) passport card switches its data source from hardcoded demo data to `useSuspenseQuery(getMyPassport)`. The four badges + trust score derive from the live `*_verified` flags — they light up emerald the instant a step is saved.
- Add a primary "Edit passport" CTA on the home card → `/dashboard/passport/edit`.
- Landlord inbox (`/dashboard/applications`) already reads these flags; no change beyond the natural refetch when the page mounts.

### 5. Out of scope (prototype)

- No real document verification, OCR, or admin review — flags flip on save, as requested.
- No virus scanning.
- No signed-URL viewer for landlords.
