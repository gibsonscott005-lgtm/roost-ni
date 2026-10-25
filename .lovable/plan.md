# Cut sign-up drop-off (email verification stays on)

## What you will see

**1. "Check your email" screen** (replaces the misleading "Account created / dashboard is ready" message shown today)
- Shows the address they typed, in bold.
- "Resend email" button, greyed out with a 60-second countdown after each send.
- Note: "Not there? Check your spam or promotions folder. It can take a couple of minutes."
- "Wrong address? Change it" link — returns to the form with their details kept, so they can fix the email and send again.

**2. 6-digit code on the same screen**
- The confirmation email will contain both the button and a 6-digit code.
- The screen has a code box. Typing the code confirms the account and signs them in without leaving the page. The link still works as before.
- Clear messages for a wrong or expired code, pointing to "Resend".

**3. Straight to the dashboard with a welcome**
- Landlords land on their dashboard (with the "Add your first property" checklist); tenants on their passport.
- A short one-time welcome note: "You're in. Your email is confirmed." plus the next step.

**4. New funnel steps on /dashboard/landlord-funnel**
Shown before the existing steps:
```text
Signed up -> Confirmation email sent -> Email confirmed -> First sign-in -> Viewed dashboard -> ...
```
These are recorded by the backend itself, because people who have not confirmed yet cannot record anything from their browser. Existing landlords get backfilled where the data exists (sign-up, confirmed, first sign-in dates); "email sent" only counts from now.

**5. Rules kept**
Email verification stays required, no auto-confirm. British English, plain wording, no "free", "compliant", "100%", "guaranteed" or "platform". Nothing posted or emailed automatically beyond the confirmation email itself.

## Technical details
- `src/routes/auth.tsx`: new `awaitingConfirmation` state after `signUp` (session is null); resend via `supabase.auth.resend({ type: "signup" })` with 60s cooldown; code entry via `supabase.auth.verifyOtp({ email, token, type: "signup" })`; "change email" resets to form with fields kept. Welcome flag via sessionStorage, shown once on dashboard/passport.
- `src/lib/email-templates/signup.tsx` + webhook: pass `data.token` and render the code under the button.
- Migration: extend event CHECK with `confirmation_email_sent`, `email_confirmed`, `first_sign_in`; SECURITY DEFINER trigger functions on `auth.users` (insert -> `signed_up`, `email_confirmed_at` set -> `email_confirmed`, first `last_sign_in_at` -> `first_sign_in`), landlords only, user id only, wrapped so failures never block sign-up. Webhook logs `confirmation_email_sent` via admin client after a signup email is sent (counts resends in `occurrences`). Backfill from `auth.users`.
- `src/lib/landlord-funnel.ts`: add the three steps to order/labels; "stuck" also flags unconfirmed for 3+ days. Update `landlord-funnel.test.ts` (new step order, unconfirmed counts as stuck).
- Verify: sign up a throwaway landlord in the preview, read the code from email logs or generate it server-side, confirm on-screen, check redirect, welcome and funnel rows; then delete the test account so it never shows in your reports.

## Credit estimate
Roughly **3 to 5 credits** in one build pass (sign-up screen, email template, database tracking, funnel page, tests and an end-to-end check). I cannot see your exact pricing, so treat this as a guide; I will do it in one go rather than in small tweaks.
