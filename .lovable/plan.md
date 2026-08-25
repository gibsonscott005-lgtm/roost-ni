# Owner Mailbox Setup Plan — Zoho Mail

## Goal
Set up a free owner mailbox on `roostni.co.uk` using Zoho Mail, while keeping `notify.roostni.co.uk` dedicated to Lovable-managed app emails.

## Important constraint
`notify.roostni.co.uk` is delegated to Lovable's nameservers for transactional/auth email sending. It cannot also host a third-party mailbox. The owner mailbox must live on the **root domain** (`roostni.co.uk`).

## Steps

1. **Sign up for Zoho Mail**
   - Go to https://www.zoho.com/mail/ and choose the free plan.
   - Sign up with an existing address (e.g. your current Gmail) as the admin contact.
   - During setup, choose to add an existing domain and enter `roostni.co.uk`.

2. **Verify domain ownership in Zoho**
   - Zoho will provide a TXT verification record.
   - Add that TXT record at your domain registrar for `roostni.co.uk`.

3. **Add Zoho MX records at your domain registrar**
   - Zoho typically requires these MX records for `roostni.co.uk`:
     - Priority 10: `mx.zoho.eu`
     - Priority 20: `mx2.zoho.eu`
     - Priority 50: `mx3.zoho.eu`
   - Confirm the exact values in the Zoho setup wizard, as they can vary by region.

4. **Add SPF, DKIM and DMARC records**
   - Add Zoho's SPF record as a TXT record for `roostni.co.uk`.
   - Generate DKIM in Zoho and add the provided TXT record.
   - Add a simple DMARC policy record, e.g. `v=DMARC1; p=none; rua=mailto:postmaster@roostni.co.uk`.

5. **Leave Lovable DNS untouched**
   - Do not change or remove the `notify.roostni.co.uk` NS records at your registrar.
   - These are separate from the root-domain MX records and will not conflict.

6. **Update the app's "from" address (optional but recommended)**
   - Change transactional email sender from `notify@notify.roostni.co.uk` to `Roost <hello@roostni.co.uk>` or `Roost <scott@roostni.co.uk>`.
   - This is done in the project's email configuration, not in DNS.

7. **Verify delivery**
   - Send a test email from the new Zoho mailbox.
   - Trigger a password reset from the Roost app and confirm it arrives.
   - Check that replies to app emails reach the Zoho inbox.

## Out of scope
- Marketing/newsletter email (not supported by Lovable Emails).
- Additional mailboxes (can be added later inside Zoho).

## Next action
Approve this plan and I will update the app's sender address and guide you through the Zoho setup.
