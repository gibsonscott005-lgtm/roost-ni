## Comprehensive End-to-End Walkthrough — Tenant & Landlord

I'll drive the live preview with Playwright using the two existing test accounts, capture screenshots at every step, and produce a pass/fail report per surface.

### Accounts
- **Tenant:** `gibsonscott005@gmail.com` (password on file)
- **Landlord:** `usgibsons2004@gmail.com` (needs password — see question below)

### Landlord route (signed in as landlord)
1. `/auth` → sign in → land on `/dashboard`
2. Dashboard overview — active listings, "Let Agreed" badges, Manage Tenancy links
3. Create a new listing via **Add Property** (NI fields, Fair Fuel toggle for Oil)
4. `/dashboard/applications` — Received Passports, Accept flow, Issue Lease button
5. `/landlord/issue-lease?share=...` — Roost template preview, Fair Fuel clause, issue
6. Counter-sign flow on an already tenant-signed lease
7. `/landlord/manage-tenancy?share=...` — all 4 tabs (Overview, Deposit, Inventory, Documents) + Maintenance tab (respond to a ticket, mark resolved)
8. Notifications bell — Realtime insert visible

### Tenant route (signed in as tenant)
1. `/auth` → sign in → land on `/dashboard`
2. Overview — Trust score, Application sent/accepted cards, banners
3. `/dashboard/passport` — verify all 3 self-certified sections + document links
4. `/dashboard/passport/edit` — open wizard, confirm inputs accept values, resume-from-incomplete-step works
5. `/listings` browse → `/listings/:id` detail → **Apply with Passport** (verify duplicate prevention)
6. `/tenant/review-lease?share=...` — sign lease, submit
7. `/tenant/tenancy?share=...` — all 4 tabs + Maintenance tab (report an issue with photo upload)
8. Notifications bell — receives landlord's status updates

### Deliverable
A single report per route with: URL, screenshot filename, observed state, and any console errors / broken buttons / missing data. Screenshots saved under `/tmp/browser/walkthrough/`.

### One question before starting
The landlord account (`usgibsons2004@gmail.com`) doesn't have a stored test password. Should I reset it to a known value (same convention as tenant: `Roost-Test-2026!xK9`) via admin script before running the walkthrough, or do you want to provide one?
