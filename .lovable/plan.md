# Outstanding items in the Roost build

A read-through of the routes, components and schema turned up the following gaps. Nothing here is broken — these are unbuilt or stubbed pieces.

## 1. Explicitly stubbed "Coming soon" buttons
- **Tenancy Information Notice (NI)** download — disabled button in the tenant Documents tab and in the landlord Documents tab. No generator exists for the statutory notice yet.
- The landlord side has a working "Download / print" for the lease; the tenant side has no equivalent lease copy download.

## 2. Property photos
No image upload anywhere. Listing cards and the detail page both render a "Photos coming soon" placeholder. Needs a storage bucket, an upload control in the create-listing form, and a gallery on the card and detail page.

## 3. Custom lease PDF path
"Issue lease" lets a landlord pick **Custom PDF** and select a file, but the file is only held in component state — it is not uploaded to storage, and the tenant review screen only renders the Roost standard template. A landlord choosing Custom currently issues a lease the tenant cannot read.

## 4. Rent ledger stops after move-in
`tenancy_receipts` only records the one-off deposit and first month's rent. There is no ongoing monthly rent schedule, arrears view, or recurring reminder — so the workspace goes quiet after move-in.

## 5. Deposit protection — certificate document
The scheme name and certificate number are saved, but there is no upload of the actual certificate PDF for the tenant to view. The 28-day countdown has no reminder notification attached either.

## 6. `notification_preferences` table is unused
The table exists in the schema but no app code reads or writes it — there is no settings screen and no per-type mute. The bell shows everything.

## 7. Listings browse is search-only
One free-text box. No filters for rent range, bedrooms, heating type, location, or "hide Let Agreed", and no sort. Fine for a handful of listings, thin once the feed grows.

## 8. Smaller items
- No account/profile settings page (change name, email, password, delete account).
- No way for a landlord to edit or unpublish a listing after creating it; drafts can be saved but not reopened.
- No tenant-side view of past or ended tenancies — the workspace only handles the current one.
- Inventory has landlord entry and tenant sign-off, but no dispute or comment path if the tenant disagrees.

## Suggested order
1. Property photos (biggest visible gap for tenants browsing)
2. Custom lease PDF upload and tenant rendering (correctness issue)
3. Ongoing rent ledger and arrears
4. Listing edit/unpublish plus browse filters
5. Statutory notice generator and deposit certificate upload
6. Notification preferences and account settings

Approve this to work through the list in that order, or tell me which item to start with and I'll scope just that one.