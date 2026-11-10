# Privacy fixes – corrected plan

## Confirmed against the live project
- tenant_passports has two landlord read rules: "Landlords read passports of accepted tenants" and "Landlords read passports shared with them" (any share not withdrawn). Both will be dropped.
- id_document_number is not in the screening field list, so the server function never returned it. The only leak was direct table reads via those two rules. Confirmed.
- No browser code reads another person's passport. The only browser read (dashboard home) reads the signed-in tenant's own row. Every landlord read already goes through server functions using the admin client after an ownership check (applicant inbox, ID/income/reference file openers). Dropping both rules breaks nothing found in code.
- Tenants already have a storage delete rule on their own tenant-documents folder, so client-side file removal works. Confirmed.
- Today the screening view also returns guarantor_name, id_document_path, income_document_path and reference_document_path (paths only, files stay gated). It returns no previous-landlord or guarantor contact details.

## Build A – security

### 1. Passport read rules
- Drop both landlord SELECT rules on tenant_passports. Tenant's own "manage" rule stays.

### 2. Move existing-tenant details to an owner-only table
New table property_tenancy_records (listing_id unique, landlord_id, existing_tenant_name, existing_tenant_email, existing_deposit_reference, timestamps), grants to authenticated/service_role only, RLS landlord_id = auth.uid() for all actions. Copy current values across in the same change, and update create_existing_tenancy (the only database function that touches these fields).

Files that read or write the three fields, all switched to the new table:
- src/routes/_authenticated/dashboard.index.tsx (property cards, tenanted-home progress)
- src/routes/_authenticated/landlord.manage-tenancy.tsx (tenant name fallback)
- src/routes/_authenticated/dashboard.listing-edit.tsx ("Current tenant" line)
- src/components/tenancy-records-panel.tsx (read, save, invite default email)
- src/lib/tenancy-invite.functions.ts (invite email tenant name)
- src/lib/reminders.server.ts (statutory reminder emails: tenant name/email)
- create_existing_tenancy database function
- src/lib/mcp/tools/get-listing.ts: replace select("*") with the explicit public column list used by search-listings (protects against any future private column too)
Public listing pages, alerts and search-listings use explicit columns and are unaffected.

Then remove the three columns from property_listings (see disagreement below on timing).

### 3. Passport summary before formal application
- Before formal_application_at: verified flags, ID status, employment status, APA willingness, first-time renter, and a server-calculated income cover ratio against that listing's rent. No exact income, no income_breakdown, no contact details, no guarantor name.
- After formal application (and share still active): exact income figures and breakdown, plus previous-landlord names/emails/phones (both slots), tenancy dates and guarantor name/address/email/phone/employment.
- New code: split getApplicantPassports into a per-share response built server-side (it currently returns one row per tenant, so it must be keyed by share to know which stage applies); compute cover server-side; add the contact fields to the post-formal select; update the applications page badge to use the returned ratio and show contacts only when present.

## Build B – tidy-up

### 4. Remove buttons in the Passport editor
- ID: delete file, clear id_document_path, id_document_number, id_document_type, id_document_expiry, issuing_country, verified_full_name, verified_date_of_birth, identity_verified, id_status (back to unverified), id_verified_at, id_provider, id_session_id, id_failure_reason. ID number no longer required once removed.
- Income file and reference file: delete file, clear the path.
- Existing guard triggers on identity fields may refuse a tenant clearing verified values; if so, add a narrow exception that allows clearing (never setting) those fields.

### 5. Account deletion
- deleteAccount deletes the user's tenant-documents folder and the listing-photos of their listings before deleting the user.
- The 13 orphaned files are not touched. Separate approval needed.

## Proof after the build (live database)
- pg_policies for tenant_passports and property_listings.
- has_column_privilege for anon and authenticated on the three fields (after column removal this shows the columns no longer exist; on the new table anon has no access).
- As a test landlord with a share: direct select on tenant_passports returns no rows; select on property_tenancy_records for another landlord's listing returns no rows; server function returns no income/contacts before formal application and returns them after. Test data deleted afterwards.
- Unit tests for the stage rules and cover ratio.

## Credit estimate
Build A
- 1. Drop rules: 0.1–0.2
- 2. New table, data copy, 7 code/function updates, MCP fix: 1.0–1.6
- 3. Per-share summary, cover ratio, contact release, page update: 0.7–1.1
- Tests and live proof for A: 0.5–0.8
- Build A total: 2.3–3.7

Build B
- 4. Remove buttons (incl. possible guard exception): 0.4–0.7
- 5. deleteAccount file clean-up: 0.2–0.3
- Orphan clean-up (when approved): 0.1
- Tests for B: 0.2–0.4
- Build B total: 0.9–1.5

## Where I disagree
- Removing the three columns in the same pass: the live site still reads them until the new code is published, so removing them first would break the dashboard, records panel and reminder emails on roostni.co.uk. Proposal: copy data, switch code, revoke read access on those columns from anon and authenticated straight away (closes the leak immediately), then remove the columns in a second small step after you publish. Removing columns also needs your approval in the database permissions prompt.
- Guarantor name is currently shown before formal application; this plan hides it until formal application to match your rule. Say if you want it kept.
