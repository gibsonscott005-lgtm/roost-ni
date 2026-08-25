# Brand Roost auth emails and send a test

Use the verified `notify.roostni.co.uk` domain to customize Lovable auth emails (sign-up confirmation, password reset, magic link) with Roost styling, then verify delivery with a test send.

## What we will do

1. **Scaffold auth email templates**
   - Run `email_domain--scaffold_auth_email_templates` to create the six auth templates and the `/lovable/email/auth/webhook` route.
   - If templates already exist, confirm overwrite so the new Roost-branded versions replace them.

2. **Apply Roost branding**
   - Edit the scaffolded templates in `src/lib/email-templates/` to match the Warm Porcelain / Emerald design system.
   - Update the webhook route's `emails` map with Roost subjects and any per-type props (e.g. first name from profile lookup with a safe fallback).
   - Keep the `Body` background `#ffffff` — email clients handle dark backgrounds poorly.

3. **Deploy the auth webhook**
   - Deploy the `auth-email-hook` edge function via `supabase--deploy_edge_functions`.
   - Confirm `src/start.ts` still leaves `/lovable/*` routes untouched.

4. **Send a test email**
   - Trigger a password-reset or magic-link email to a known address through the live app.
   - Check `email_domain--list_email_logs` for a `sent` event.

5. **Show the user where to monitor**
   - Cloud → Emails for domain status, delivery events, and suppression/unsubscribe state.
   - Project Settings → Email for future template tweaks.

## What you need to do

- Approve this plan.
- Provide an email address for the test send (or confirm we can use your account email).

After the test succeeds, auth emails will send from `Roost <noreply@notify.roostni.co.uk>` with branded templates.
