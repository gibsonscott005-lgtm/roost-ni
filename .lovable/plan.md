# Beta tester readiness check

## Current state

- The security scan is stale (last run 11 Aug 2026). No findings then, but the platform will not publish until a fresh scan is run and clear.
- The app is not yet published. A preview link is available, but it is Lovable-login-only unless converted into a 7-day public share link.
- The four gaps from the previous outstanding list are still unbuilt: scheduled reminders, email delivery, listing photo ordering/cover picker, and publishing itself.
- Payments and identity verification remain in simulated mode (intentional for the prototype).

## What this means for testers

You can approach testers now, but only with a **temporary public preview link** (Share → Share preview, 7 days, no Lovable account required). That keeps the preview login-only while the public link is active.

If you want a permanent, shareable URL, you must first:

1. Run a fresh security scan.
2. Resolve any critical findings it reports.
3. Publish the site.

Publishing with the four gaps still open is allowed, but testers will notice the missing pieces: rent reminders only arrive when a landlord manually clicks, notifications never reach email, and listing photos are always in upload order.

## Recommended paths

```text
Option A: Quick tester invite now
  - Share → Share preview → generate a 7-day public link.
  - Send it to a small trusted group with a note that the items above are still being built.

Option B: Clean beta launch
  - Approve the plan to close the remaining four gaps.
  - Run a fresh security scan.
  - Publish the app to a permanent public URL.
  - Then invite testers.
```

## If you choose Option B, the order is

1. Scheduled reminders endpoint (`/api/public/`) — daily scan for rent due, rent overdue, deposit 28-day deadline, and safety certificates expiring within 30 days.
2. Email delivery for high-priority notifications (lease issued, notice served, maintenance reported, deposit deadline, etc.) using the existing notification ledger.
3. Listing photo ordering and cover-image picker.
4. Run a fresh security scan and publish.

## Technical section

- **Security scan:** `security--run_security_scan` will refresh the report. The app cannot publish while it is stale or while critical findings exist.
- **Publishing:** `preview_ui--publish` creates the permanent `.lovable.app` URL. The effective visibility is currently set to `public`, so the first publish will be publicly visible.
- **Preview link:** Generated in the editor from Share → Share preview. No build or scan required.
- **Remaining features:** No schema changes are needed for scheduled reminders or email notifications (they reuse the existing `notifications` table and notification types). Photo ordering needs a lightweight `display_order` column and a drag UI on the listing-photos component.

## Decision needed

Pick one of the two paths above, or name a single gap to start with.
