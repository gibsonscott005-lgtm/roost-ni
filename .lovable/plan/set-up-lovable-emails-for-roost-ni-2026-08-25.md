# Set up Lovable Emails for Roost.ni

Switch the app's high-priority notifications and daily reminders from the current Resend stub to Lovable's built-in email infrastructure. Sending is included in your paid Lovable plan (50,000 transactional emails/month; overage billed at 4 credits per 1,000).

## What we will do

1. **Configure the sender domain**
   - Open the Lovable email-domain setup dialog.
   - Use a subdomain of your existing custom domain, e.g. `notify.roostni.co.uk`.
   - Complete DNS delegation through the dialog and wait for status to become active/provisioned before proceeding.

2. **Install email infrastructure**
   - Run `email_domain--setup_email_infra` to create the pgmq queues, RPC wrappers (`enqueue_email`, `read_email_batch`, etc.), `email_send_log`, `suppressed_emails`, `email_unsubscribe_tokens`, Vault secrets, and the shared `/lovable/email/queue/process` route.
   - Run `email_domain--scaffold_transactional_email` to create the transactional send/preview routes, suppression/unsubscribe handlers, and sample templates.
   - Install the required packages if they are not already present: `@lovable.dev/email-js`, `@lovable.dev/webhooks-js`, `@react-email/components`, `@react-email/render`.
   - Confirm `src/start.ts` leaves `/lovable/*` routes untouched (it currently has no blocking `beforeLoad`, so this should be a no-op).

3. **Create Roost-branded email templates**
   - Add `src/lib/email-templates/` with a generic `notification-alert.tsx` template (and, if the SDK requires static subjects, a small set of type-specific templates for the 9 high-priority alerts).
   - Register templates in `src/lib/email-templates/registry.ts`.
   - Match the Warm Porcelain palette and Emerald accent used in the app.

4. **Replace the Resend helper**
   - Rewrite `src/lib/notification-email.server.ts` to send via the Lovable transactional route/SDK instead of Resend.
   - Keep the existing behaviour: respect `notification_preferences.email_enabled` and `email_muted_types`, skip non-email notification types, never throw, and never block the in-app notification.
   - Update `src/lib/reminders.server.ts` so daily rent/deposit/certificate reminders use the same Lovable helper.
   - Remove or deprecate `RESEND_API_KEY` / `EMAIL_FROM` checks once cut over.

5. **Update the settings UI**
   - Change `src/lib/email-status.functions.ts` and the email-status banner in `src/routes/_authenticated/dashboard.settings.tsx` to report the Lovable domain status instead of Resend credentials.
   - Keep the same toggle UX for in-app and email alerts.

6. **Add the branded unsubscribe page**
   - After scaffolding reports the chosen unsubscribe page path, create the corresponding route/page so email footer links land on a Roost-branded screen rather than a raw API route.

7. **Verify end-to-end**
   - Trigger one of the email-enabled notification types (e.g., `application_accepted` or `lease_issued`) and confirm a row appears in `email_send_log`.
   - Hit `/api/public/daily-reminders` with `REMINDERS_CRON_SECRET` and confirm the job runs without errors and that deadline reminders are enqueued.
   - Confirm unsubscribed addresses are respected via `suppressed_emails`.

## What you need to do

- Approve this plan.
- Complete the email-domain setup dialog when prompted (choose the subdomain and confirm DNS delegation).

After that, all implementation steps are handled in code.
