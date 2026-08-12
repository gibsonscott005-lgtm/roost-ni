# What's still outstanding in Roost

Checked against the current code. Most of the earlier list is now done: safety certificate vault, browse filters, account settings (name/phone/email/password/delete), full end-of-tenancy workflow, tenant application withdrawal and re-apply, and custom-PDF lease viewing on both sides.

Four genuine gaps remain.

## 1. Reminders only fire when a human clicks
Rent-due, rent-overdue and 28-day deposit-deadline notifications exist as types, but they are only sent from buttons inside the landlord tenancy workspace. Nothing runs on a schedule, so a landlord who never opens the workspace sends no reminder and the tenant gets no warning. Certificate expiry has the same shape — expiry dates are stored but nothing announces them.

Fix: a scheduled endpoint under `/api/public/` protected by a shared secret, called daily, scanning for rent due/overdue, deposits approaching the 28-day deadline, and certificates expiring within 30 days, emitting notifications idempotently (one per item per day).

## 2. Notifications are in-app only
Everything lives in the bell. If neither party is signed in, a served notice, an issued lease or an emergency maintenance report goes unseen. Email delivery for a small set of high-priority types would close this.

## 3. Listing photos cannot be ordered
Upload and delete work, but there is no drag-to-reorder and no cover-image picker — the first uploaded photo is always the card image.

## 4. Not yet published
The app is still preview-only. Testers need either a 7-day preview link or a published URL.

## Smaller notes
- Payments stay in simulated mode behind the feature flag — intentional for now.
- Identity verification uses the simulated provider path — also intentional for the prototype.

## Suggested order
1. Scheduled reminders (biggest behavioural gap)
2. Email delivery for high-priority notifications
3. Photo ordering and cover image
4. Publish for testers

Approve to work through in that order, or name the single item to start with.