## Step 3 — Conditional References (First-Timer vs Experienced)

Rework Step 3 of the Tenant Passport wizard so it branches on whether the tenant has rented before, capturing either a UK guarantor or one-to-two landlord references that together cover three years of history. Update the home passport card to reflect the chosen path.

### 1. Database migration — `tenant_passports`

Add the fields needed to persist either branch. All nullable so existing rows stay valid.

- `is_first_time_renter` (boolean, default false)
- Guarantor (Branch A):
  - `guarantor_name` (text)
  - `guarantor_address` (text)
  - `guarantor_email` (text)
  - `guarantor_phone` (text)
  - `guarantor_employment_status` (text)
- Second landlord reference (Branch B):
  - `previous_landlord_name_2` (text)
  - `previous_landlord_email_2` (text)
  - `previous_landlord_phone_2` (text)
  - `tenancy_start_date_2` (date)
  - `tenancy_end_date_2` (date)
- Convert the existing free-text history into structured dates for the primary reference:
  - `tenancy_start_date` (date)
  - `tenancy_end_date` (date)
  - Keep `tenancy_duration` in place for now — no data backfill — and stop writing to it from the wizard.

No RLS, GRANT or bucket changes — existing policies already cover the user's own row.

### 2. `src/routes/_authenticated/dashboard.passport.edit.tsx`

Extend the `Passport` interface with the new columns. Replace the body of `ReferencesStep` with a single form that branches on a toggle:

- **Entry toggle** — segmented "Is this your first time renting a property?" (Yes / No), seeded from `is_first_time_renter`. Defaults to whichever side already has data; otherwise No.

- **Branch A — Guarantor (first-time renters):**
  - Section heading "Guarantor details" with helper copy: "Landlords require first-time renters to provide a UK-based guarantor who can cover rent liabilities if needed."
  - Required fields: full name, UK residential address (textarea), email, phone, employment / income status (same select options as the income step).
  - Reuses the existing optional `FileDrop` labelled "Supporting document (optional)" → `reference_document_path`.

- **Branch B — Landlord references (experienced renters):**
  - "Most recent landlord" block: name, email, phone, tenancy start date, tenancy end date (all required, native `<input type="date">`).
  - Compute duration from the two dates in months. If `< 36` months, render a second block "Previous landlord reference" with the same five required fields. If `>= 36` months, hide and clear the second block in local state.
  - Show an inline hint above the second block: "Add an earlier landlord so we cover the last 3 years of your history."
  - Keep the existing optional reference-letter `FileDrop`.

- **Submit logic:**
  - Validate the active branch only. End date must be after start date for each landlord block. Second landlord required only when first tenancy `< 36` months.
  - On Branch A submit, write guarantor fields + `is_first_time_renter: true` and clear all landlord/tenancy date columns to null. On Branch B submit, write landlord fields (clearing landlord 2 columns when not needed) + `is_first_time_renter: false` and clear guarantor columns. Always set `reference_verified: true` and upload the optional file via the existing `uploadDoc(user.id, "references", file)` when present.

No changes to the identity or income steps.

### 3. `src/routes/_authenticated/dashboard.index.tsx`

- Extend the passport SELECT and local type with the new columns.
- Update the "References" badge sub-label (currently a hard-coded "Self-Certified") to a dynamic value:
  - First-time renter with guarantor name set → `Guarantor Provided`.
  - Experienced renter with second landlord present → `2 Landlord References`.
  - Experienced renter with only the first landlord → `1 Landlord Reference`.
  - Otherwise (pending) → falls back to `Self-Certified` as today.
- Update the "Reference letter" `DocumentRow` `sectionFilled` check so it stays "complete" when either guarantor or landlord details are populated, not just `previous_landlord_name`.

### Out of scope

- No background-check / verification of the guarantor or landlords — branch outputs remain self-certified.
- No landlord-side views or `passport_shares` changes.
- No new storage bucket; reuse `tenant-documents` for the optional file.
- No data backfill of the existing free-text `tenancy_duration` into the new date columns.

### Technical notes

- Tenancy duration computed as `Math.floor((end - start) / (1000*60*60*24*30.44))` months; the 36-month threshold is checked live in the form.
- Date inputs use the native control for zero-cost UX (no extra deps).
- British English copy throughout ("Guarantor", "Landlord reference", "UK residential address").
