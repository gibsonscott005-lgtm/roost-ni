# Forgot password for Roost

Let people who've forgotten their password request a reset email and set a new one.

## What the user sees

1. On the sign-in card, a "Forgot your password?" link under the password field.
2. Tapping it swaps the card into a **Reset mode**: email field only, "Send reset link" button, and a "Back to sign in" link. Same styling, same email typo suggestion helper.
3. After submitting, a confirmation panel: "If an account exists for that email, we've sent a reset link. Check your inbox." (Same message whether or not the email exists, so accounts can't be enumerated.)
4. The emailed link opens a new **Set a new password** page: new password + confirm password, minimum 6 characters, mismatch shown inline. On success: toast "Password updated", then straight into the dashboard.
5. If the link is expired or already used, that page shows a clear message with a button back to request a fresh link.

## Technical notes

- `src/routes/auth.tsx`: add a third mode (`reset`) alongside signup/login. Submitting calls `supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo: `${window.location.origin}/reset-password` })`. Errors other than genuine failures stay generic to avoid enumeration.
- The page's existing `onAuthStateChange` redirect must not hijack recovery: skip the auto-redirect to `/dashboard` when the event is `PASSWORD_RECOVERY`, and if a recovery session lands on `/auth`, navigate to `/reset-password` instead.
- New public route `src/routes/reset-password.tsx` (top-level, outside `_authenticated`, no auth gate). It waits for the recovery session via `onAuthStateChange` / `getSession()`, shows a spinner while resolving, then the form. Submit calls `supabase.auth.updateUser({ password })` and navigates to `/dashboard`.
- Route `head()` with its own title/description; British English copy throughout.
- No database or schema changes. Reset emails use the existing built-in auth email templates.

## Out of scope

Custom-branded reset email templates and a custom sending domain — the default auth email is used. Say the word if you'd like branded emails set up afterwards.
