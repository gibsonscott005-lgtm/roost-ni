# Owner Mailbox Setup Plan

## Goal
Set up a working owner mailbox on `roostni.co.uk` for sending and receiving email, while keeping `notify.roostni.co.uk` dedicated to Lovable-managed app emails.

## Important constraint
`notify.roostni.co.uk` is delegated to Lovable's nameservers for transactional/auth email sending. It cannot also host a third-party mailbox. The owner mailbox must live on the **root domain** (`roostni.co.uk`) or a different subdomain (e.g. `mail.roostni.co.uk`).

## Provider choice
Proton Mail's custom-domain feature requires a paid plan (Mail Plus / Business), so it is not free. For a free custom-domain mailbox at this stage, the recommended option is **Zoho Mail**, which offers a free tier for small teams with custom-domain support.

## Steps

1. **Choose final provider**
   - Option A: Zoho Mail (free custom-domain mailbox).
   - Option B: Proton Mail (paid, privacy-focused).
   - Confirm choice before DNS changes.

2. **Create the mailbox account**
   - Sign up at the chosen provider.
   - Add `roostni.co.uk` as the custom domain.
   - Note the provider's required DNS records (typically MX, SPF, DKIM, DMARC).

3. **Add DNS records at the domain registrar**
   - Add MX records for `roostni.co.uk` pointing to the provider's mail servers.
   - Add SPF, DKIM and DMARC records as instructed by the provider.
   - Leave `notify.roostni.co.uk` NS records untouched so Lovable email sending continues to work.

4. **Update the app's "from" address (optional but recommended)**
   - Change transactional email sender from `notify@notify.roostni.co.uk` to a friendly address such as `hello@roostni.co.uk` or `Roost <hello@roostni.co.uk>`.
   - This is done in the project's email configuration, not in DNS.

5. **Verify delivery**
   - Send a test email to and from the new mailbox.
   - Confirm emails land in inbox (not spam) and replies reach the owner mailbox.

## Out of scope
- Marketing/newsletter email (not supported by Lovable Emails).
- Multiple mailboxes or team inboxes (can be added later with the same provider).

## Next action needed from you
Confirm whether to proceed with **Zoho Mail (free)** or **Proton Mail (paid)**.
