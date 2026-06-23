## Hybrid References step — contact details + optional reference letter

The Step 3 form already collects previous landlord name, email and phone. I'll add a tenancy duration field, make the four text fields the required set, add an optional reference letter dropzone, store the file path alongside the passport record, and surface the document on the dashboard.

### 1. Database migration — `tenant_passports`

Add two nullable columns:

- `tenancy_duration` (text) — free-text tenancy length (e.g. "18 months", "2 years").
- `reference_document_path` (text) — storage path in the existing `tenant-documents` bucket.

No RLS or grant changes — existing policies on `tenant_passports` already cover the user's own row, and the `tenant-documents` bucket policies already scope INSERT/SELECT/DELETE by `auth.uid()` folder. No new bucket needed.

### 2. `src/routes/_authenticated/dashboard.passport.edit.tsx`

Update `Passport` interface to include `tenancy_duration` and `reference_document_path`.

In `ReferencesStep`:

- Add a `tenancyDuration` state, seeded from the passport.
- Add a new `Field` for "Tenancy duration" (text input, required) alongside the existing landlord fields.
- Add a `FileDrop` labelled **"Reference letter (optional)"** below the contact fields, with a short hint that it's not required.
- On submit:
  - Require all four text fields (name, email, phone, tenancy duration). The reference letter stays optional.
  - If a file is selected, call the existing `uploadDoc(user.id, "references", file)` helper and capture the returned path.
  - Update the row with `previous_landlord_name`, `previous_landlord_email`, `previous_landlord_phone`, `tenancy_duration`, `reference_document_path` (only when a new file was uploaded — otherwise preserve the existing path), and `reference_verified: true`.

No changes to the identity/income steps.

### 3. `src/routes/_authenticated/dashboard.index.tsx` — TenantDashboard

- Extend the passport SELECT to fetch `tenancy_duration` and `reference_document_path`.
- Add the field to the local `passport` state type.
- Add a third `DocumentRow` to the "Documents on file" list:
  - When `reference_document_path` is set → render the row exactly like ID/Income (filename + "Self-Certified" pill + View button, signed URL via the existing helper).
  - When not set but the contact details are filled → render a muted "Reference letter — not uploaded (optional)" line with no "Add" CTA, to make clear the section is still complete.
  - When neither contact details nor a file exist → fall back to the existing "Add" affordance.
- The Reference badge in the 4-badge grid already reads "Self-Certified" once `reference_verified` is true — no change there. Filling in the four required text fields in Step 3 already flips that flag, so the card status is correct without any client-side recomputation.

### Out of scope

- No background-check language, no verification of the reference letter contents — it's tenant-supplied, in line with the existing "Self-Certified" framing.
- No changes to landlord views or `passport_shares`.
- No new storage bucket (`tenant-documents` is reused).

### Technical notes

- File constraints reuse `FileDrop`'s existing 10 MB / JPG-PNG-PDF limits.
- Signed URL TTL of 60 s matches the ID and income rows.
- British English copy throughout ("Reference letter", "Tenancy duration").
