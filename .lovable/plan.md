# What's outstanding in Roost

Checked against the current code rather than the old list. Several earlier items are now done: rent ledger and arrears, listing edit/unpublish/delete, statutory Tenancy Information Notice, deposit certificate upload, notification preferences, custom lease PDF upload, browse filters and sort, inventory dispute field.

## 1. Safety certificate vault (biggest credibility gap)
There is no storage, upload, expiry tracking or tenant-visible copy for EPC, Gas Safety, Electrical (EICR) or smoke/CO alarm confirmation. These are the documents an NI landlord is judged on, and Roost currently only mentions them inside lease wording. Needs a certificates table, uploads on each property, expiry reminders, and a copy in the tenant's Documents tab.

## 2. Browse filters ignore the new listing fields
Filters cover rent range, heating, Fair Fuel and Let Agreed only. Listings now carry property type, bedrooms, bathrooms, furnished status, availability date, bills and parking — the feed should filter and sort on those too.

## 3. Account settings are notifications-only
`/dashboard/settings` handles notification preferences. There is no way to change name, phone, email or password, and no delete-account path.

## 4. End of tenancy
The workspace stops at an active tenancy. Nothing exists for notice to quit, tenancy end date, final inspection against the move-in inventory, deposit return or dispute, or returning the property to Available. Tenants have no view of past tenancies.

## 5. Smaller gaps
- Landlord cannot download a copy of a signed custom-PDF lease the way the standard template can be printed.
- Rent-due and deposit 28-day deadline reminders are computed in the UI but no notification actually fires on schedule.
- No tenant-side way to withdraw an application.
- Listing photos cannot be reordered and there is no cover-image choice.

## Suggested order
1. Safety certificate vault — completes the compliance story
2. Browse filters on the new fields — makes the data just captured useful
3. Account settings
4. End-of-tenancy workflow
5. Smaller gaps

Approve to work through in that order, or name the single item to start with.