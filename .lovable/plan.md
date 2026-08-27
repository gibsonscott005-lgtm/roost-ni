# Owner Mailbox — Free Send and Receive on roostni.co.uk

Status: mailbox verified and working. The user confirmed inbound Cloudflare routing and outbound Gmail send-as are both operating.

## Completed

- Cloudflare DNS authoritative for `roostni.co.uk`.
- Cloudflare Email Routing enabled and forwarding to personal Gmail.
- Gmail App Password generated.
- Gmail "Send mail as" configured for `scott@roostni.co.uk` via `smtp.gmail.com`.
- SPF/DMARC records in place.
- Test send and reply confirmed working.

## Remaining app-side follow-up

Set the reply-to header on all Roost app/transactional emails so tenant and landlord replies land in the owner inbox.

### What will change

- In `src/lib/email-templates/send-email.ts`, add a default `reply_to` value: `Roost Support <support@roostni.co.uk>`.
- The sender domain stays `notify.roostni.co.uk`; only the reply-to address changes.
- This affects high-priority notification emails (application accepted, lease issued, rent overdue, etc.) and any other transactional sends using `sendTemplateEmail`.

### What will not change

- Auth emails (signup, password reset, magic link) continue to use the Lovable auth webhook handler, which does not expose a reply-to option; they will still show `noreply@notify.roostni.co.uk` as the sender.
- No DNS changes.
- No mailbox changes.

Approve switching to build mode and I will make the one-line code change, then run a quick build check.
