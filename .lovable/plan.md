# Owner Mailbox — Free Send and Receive on roostni.co.uk

Your approach works. Cloudflare Email Routing handles incoming mail for free, and Gmail's "Send mail as" handles outgoing mail through your existing Gmail account. No paid mailbox needed.

There is one prerequisite worth flagging before you start: Cloudflare Email Routing only works when Cloudflare is the authoritative DNS provider for `roostni.co.uk`. Moving DNS to Cloudflare means every existing record has to be recreated there, including the site records that keep roostni.co.uk online and the delegation that keeps Roost's app emails working. That is the only risky step in the whole plan, so it goes first and gets checked carefully.

## Step 1 — Move DNS for roostni.co.uk to Cloudflare (careful step)

1. Create a free Cloudflare account and add `roostni.co.uk` as a site.
2. Cloudflare will import most existing records automatically. Before changing nameservers, confirm the imported list includes:
   - The A records that point the root domain and `www` at Lovable hosting.
   - The `_lovable` TXT verification record.
   - The NS records that delegate `notify.roostni.co.uk` to Lovable's nameservers, plus any other records under `notify`.
3. If the `notify` delegation did not import, add the NS records exactly as shown in Cloud → Emails before switching nameservers.
4. Only then update the nameservers at your registrar to the pair Cloudflare gives you.
5. After propagation, confirm roostni.co.uk still loads and trigger a Roost password reset to confirm app emails still send.

If you would rather not move DNS, say so and I will plan the alternative (a small paid mailbox on the existing DNS instead).

## Step 2 — Enable Cloudflare Email Routing (incoming)

1. In Cloudflare, open Email → Email Routing and enable it for `roostni.co.uk`.
2. Accept the MX and SPF records Cloudflare adds for the root domain.
3. Add your personal Gmail address as a destination and verify it.
4. Create the custom addresses you want, each forwarding to that Gmail address:
   - `scott@roostni.co.uk`
   - `support@roostni.co.uk`
   - optionally a catch-all rule

## Step 3 — Gmail App Password

1. In Google Account → Security, confirm 2-Step Verification is on.
2. Create an App Password named `Roost NI Mail` and copy the 16-character code.

## Step 4 — Gmail "Send mail as" (outgoing)

1. Gmail → Settings → Accounts and Import → Send mail as → Add another email address.
2. Name: `Roost NI`. Address: `scott@roostni.co.uk`. Leave "Treat as an alias" checked.
3. SMTP server `smtp.gmail.com`, port `587`, TLS, username = your Gmail address, password = the App Password.
4. Google emails a verification code to `scott@roostni.co.uk`, which Cloudflare forwards to your Gmail inbox. Confirm it.
5. Optionally set `scott@roostni.co.uk` as the default "From" address.

## Step 5 — Deliverability check

1. Confirm Cloudflare's SPF record for the root domain includes Google's sending servers (`include:_spf.google.com`) alongside Cloudflare's own value, so mail sent as `@roostni.co.uk` via Gmail passes SPF.
2. Add a DMARC TXT record at `_dmarc.roostni.co.uk`: `v=DMARC1; p=none; rua=mailto:scott@roostni.co.uk`.
3. Send a test to a non-Google address, reply to it, and confirm both directions work.

## Step 6 — App-side follow-up (small change in Roost)

Once the mailbox is live, I will set the reply-to address on Roost's outgoing emails to `support@roostni.co.uk` so tenant and landlord replies land in your inbox. The sender domain itself stays `notify.roostni.co.uk` — that is what keeps deliverability and the Lovable email setup intact.

## Explicitly out of scope

- Changing the sending domain away from `notify.roostni.co.uk`.
- Any paid mailbox provider.
- Inbound email processing inside the Roost app.

## Notes

- All account, DNS and Gmail steps are yours to perform; I cannot log into Cloudflare or Google on your behalf, but I will check values with you as you go.
- Gmail's send-as has a daily sending limit suitable for personal correspondence only, which is fine because Roost's automated emails continue to go through Lovable.
