# Roost build — status against the approved list

Two of the six ordered items are complete. Here is where each stands.

## Done
**1. Property photos** — private `listing-photos` bucket, upload control in the create-listing form, cover image on cards, gallery on the detail page.

**2. Custom lease PDF** — landlord uploads to the `tenancy-documents` bucket on issue, the share records `lease_kind` and `lease_document_path`, and the tenant review screen opens the real PDF before signing instead of the standard template. Tenant can also download a signed copy of the standard lease.

Also delivered early from item 4 and item 5: browse filters (rent range, heating, Fair Fuel, hide Let Agreed, sorting) and the landlord Tenancy Information Notice generator.

## Still outstanding

**3. Ongoing rent ledger and arrears** — receipts stop after the move-in payment. Needs a monthly rent schedule generated from the tenancy start date, a paid / due / overdue state per month, an arrears total on both workspaces, and a notification when a month goes overdue.

**4. Listing edit and unpublish** — a landlord cannot reopen a draft or edit a live listing. Needs an edit route reusing the create form, plus publish/unpublish and delete controls on the dashboard property card.

**5. Deposit certificate upload and tenant notice** — the scheme name and certificate number save, but the certificate PDF cannot be uploaded or viewed by the tenant. The tenant Documents tab still shows a disabled "Coming soon" button where the Tenancy Information Notice should be. Also needs a reminder notification as the 28-day deadline approaches.

**6. Notification preferences and account settings** — the `notification_preferences` table is unused. Needs a settings screen with an in-app toggle and per-type mute, plus profile basics (name, phone, password change).

## Smaller gaps not in the six
- No tenant view of past or ended tenancies.
- Inventory has no dispute or comment path when the tenant disagrees.

## Suggested next step
Take item 3 (rent ledger) next — it is the largest functional hole and it makes the workspace useful beyond move-in day. Alternatively item 5 is the quickest to close since the notice generator already exists and only needs wiring into the tenant tab plus a certificate upload.
