# Automatic welcome emails for new sign-ups

## What we're building

Every new RoostNI sign-up automatically receives a branded welcome email moments after creating their account — no manual sending needed. Tenants and landlords get different versions, each pointing them at their first step (tenant: set up your Tenant Passport; landlord: add your first property or take the audit).

## How it works

1. **Two new email templates** (`welcome-tenant`, `welcome-landlord`) in the existing email template folder, matching the RoostNI look already used for notification emails (white background, emerald accents, reply-to support@roostni.co.uk).
2. **Personal founder sign-off**: each email closes like a hand-written note — "Thanks again, Scott — Founder, RoostNI" — with an invitation to reply directly. Plain, warm copy (no marketing buttons or hype) so it reads as a personal email, not an automated blast.
3. **A server-side send function** that:
   - Checks the account genuinely exists and was created within the last 15 minutes (prevents anyone abusing it to send email to arbitrary addresses).
   - Picks the tenant or landlord template based on the account type.
   - Uses a fixed idempotency key per account (`welcome-{userId}`) so retries can never send the same person two welcome emails.
   - Fails silently — an email problem never breaks or blocks sign-up.
4. **Sign-up page hook**: after `supabase.auth.signUp` succeeds in `src/routes/auth.tsx`, the page calls the send function fire-and-forget (not awaited, errors swallowed). The existing "Account created" toast and redirect are untouched.

## Technical details

- Reuses the scaffolded `sendTemplateEmail` helper and verified `notify.roostni.co.uk` sender — no new infrastructure, no queues, no database changes.
- New files: `src/lib/email-templates/welcome-tenant.tsx`, `src/lib/email-templates/welcome-landlord.tsx`, `src/lib/welcome-email.functions.ts`; edits to `registry.ts` and `auth.tsx` only.
- The server function is public by necessity (no session exists straight after sign-up when email confirmation is on), so the 15-minute-creation check plus per-user idempotency key are the abuse guards.
- The built-in auth "confirm your email" email still sends as before; the welcome email complements it with getting-started guidance.

## Verification

- `bunx tsgo --noEmit` passes.
- Create a test sign-up in the preview, then confirm via the email logs that exactly one welcome email was sent with the right template; re-trigger to confirm no duplicate sends.
- Note: final delivery can only be confirmed on the published site, so we'll publish and check the live email logs afterwards.
