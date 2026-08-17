# Option B — clean beta launch

Four pieces of work, then publish. Each is independent, so we can stop after any of them.

## 1. Scheduled reminders

Today rent-due, rent-overdue and deposit-deadline notifications only fire when a landlord clicks a button in the tenancy workspace, and certificate expiry dates are stored but never announced. A landlord who never opens the workspace sends nothing.

Add a daily job that scans every active tenancy and emits notifications automatically:

- Rent due in 3 days, and rent overdue.
- Deposit protection approaching the 28-day statutory deadline (14, 7, 3 and 1 day out) and past it.
- Safety certificates (EPC, Gas, EICR, alarms) expiring within 30 days, and expired.

Each item produces at most one notification per day, so a re-run never spams. Both tenant and landlord get the ones relevant to them.

## 2. Email delivery for high-priority notifications

Everything currently lives in the bell, which means a served notice or an emergency repair goes unseen if nobody is signed in. Add email for a short list of types only:

Lease issued, lease signed, lease counter-signed, notice to quit served, emergency maintenance reported, deposit deadline approaching, rent overdue, application accepted.

Emails are plain, branded Roost, British English, and link straight to the relevant screen. Everything else stays in-app. The existing notification preferences screen gains a per-type email toggle so testers can turn it off.

This needs a sending domain set up for Roost. Until a custom domain is verified, emails send from the Lovable-provided sender address.

## 3. Listing photo ordering and cover image

Photos upload and delete, but the first one uploaded is always the card image. Add drag-to-reorder in the listing form and edit screen, plus a "Set as cover" action on each photo. The card, the detail gallery and dashboard thumbnails all follow the new order.

## 4. Security scan and publish

Run a fresh security scan, resolve anything critical, then publish to a permanent public URL. The project's publish visibility is already set to public, so the first publish is immediately shareable.

## Technical section

- **Reminders:** new route `src/routes/api/public/daily-reminders.ts` guarded by a shared secret header, plus `src/lib/reminders.server.ts` holding the scan logic. Scheduling via `pg_cron` + `pg_net` calling the stable `project--<id>.lovable.app` URL daily. Idempotency through a small `reminder_log` table keyed on (entity, type, date) with a unique constraint — insert-on-conflict-do-nothing decides whether to send.
- **Email:** Lovable email infrastructure for the sending domain; a `sendNotificationEmail` helper in `src/lib/notification-email.server.ts` called from the existing `emit_notification` path so both scheduled and interactive notifications route through one place. New boolean columns on `notification_preferences` for email opt-out per type.
- **Photos:** no schema change — `photo_paths` is already an ordered text array on `property_listings`; reordering rewrites the array and index 0 is the cover. Drag handling with pointer events in `src/components/listing-photos.tsx`, wired into `dashboard.listing-edit.tsx` and the create-listing form.
- **Certificates:** expiry dates already exist on `property_certificates`; the job reads them directly.

## Order

1. Scheduled reminders
2. Email delivery
3. Photo ordering and cover
4. Scan and publish
