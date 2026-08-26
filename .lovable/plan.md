# Owner Mailbox Setup Plan — Low-cost Send and Receive

## Goal
Set up an inexpensive owner mailbox on `roostni.co.uk` for genuine sending and receiving, while keeping `notify.roostni.co.uk` dedicated to Lovable-managed app emails.

## Important constraint
`notify.roostni.co.uk` is delegated to Lovable's nameservers for transactional/auth email sending. It cannot also host a third-party mailbox. The owner mailbox must live on the **root domain** (`roostni.co.uk`).

## Recommended option

Use **Purelymail**. It supports custom domains, webmail, IMAP and SMTP, and charges by usage rather than per mailbox. The current published pricing requires an initial **US$10 credit**, which should last a low-volume owner mailbox considerably longer than a typical monthly subscription.

Cloudflare Email Routing is not the right fit for this requirement: it is excellent for free incoming forwarding, but it is not a normal mailbox and does not provide native outgoing email and replies from `@roostni.co.uk`.

## Steps

1. **Create a Purelymail account**
   - Sign up at https://purelymail.com/ using your existing Gmail address as the account contact.
   - Add the initial US$10 account credit.
   - Add `roostni.co.uk` as a custom domain.

2. **Verify domain ownership**
   - Purelymail will provide a TXT verification record.
   - Add that TXT record at your domain registrar for `roostni.co.uk`.

3. **Add the mailbox DNS records**
   - Copy the exact MX records shown by Purelymail into the DNS settings for `roostni.co.uk`.
   - Remove any obsolete root-domain MX records only after comparing them with the provider's instructions.

4. **Configure deliverability**
   - Add Purelymail's exact SPF record as a TXT record for `roostni.co.uk`.
   - Generate DKIM in Purelymail and add the provided TXT record.
   - Add a simple DMARC policy record, e.g. `v=DMARC1; p=none; rua=mailto:postmaster@roostni.co.uk`.

5. **Leave Lovable DNS untouched**
   - Do not change or remove the `notify.roostni.co.uk` NS records at your registrar.
   - These are separate from the root-domain MX records and will not conflict.

6. **Create the owner address**
   - Create one mailbox such as `scott@roostni.co.uk` or `hello@roostni.co.uk`.
   - Use Purelymail webmail, or add the mailbox to your preferred phone/desktop mail app using its IMAP and SMTP settings.

7. **Verify delivery**
   - Send a test email from the new mailbox to Gmail and reply to it.
   - Trigger a password reset from the Roost app and confirm it arrives.
   - Once the mailbox works, configure Roost app emails to use it as the reply-to address without changing the Lovable sender domain.

## Out of scope
- Marketing/newsletter email (not supported by Lovable Emails).
- Moving the domain to Cloudflare DNS; this is unnecessary for a hosted mailbox and introduces avoidable DNS migration risk.

## Next action
Approve this plan and I will guide you through the provider screens and help verify each DNS value before you add it. The mailbox account and billing must be created by you directly with the provider.
