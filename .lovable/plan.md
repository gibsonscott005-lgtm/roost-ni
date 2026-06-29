## Diagnosis (already verified against the database)

Two separate auth users exist for the same person:

- `gibsonscott005@gmail.com` → 1 `passport_shares` row with `status='accepted'`.
- `gibsonscott005@mail.com` (typo: missing the "g" in "gmail") → 0 rows.

The tenant dashboard data layer is working correctly. The "sometimes I see my application, sometimes I don't" behaviour is caused by signing in to whichever of the two accounts the browser autofills that session. The `mail.com` account has nothing to show because it isn't the account that applied.

No schema, RLS, or `passport_shares` query changes are needed.

## Fix (applies to every current and future user)

1. **Always show the signed-in identity on the tenant dashboard.**
   - In `src/routes/_authenticated/dashboard.index.tsx` (`TenantDashboard`), render the signed-in email (and account type chip) near the "Welcome back" header so the user can instantly tell which account they're on.
   - Add a small "Not you? Sign out" link next to it that calls `supabase.auth.signOut()` then `navigate({ to: "/auth" })`.

2. **Make the empty-applications state diagnostic, not silent.**
   - When `applicationCounts.sent === 0`, render a dedicated empty card in the existing "Your applications" section (currently lower in the file) that:
     - States plainly "No applications on this account yet".
     - Echoes the signed-in email so a mismatched account is obvious.
     - Offers two CTAs: **Browse properties** (`/listings`) and **Switch account** (sign out → `/auth`).
   - This replaces the current "0 sent / 0 accepted" silence that made the duplicate-account case look like a bug.

3. **Prevent typo-driven duplicate accounts at sign-up.**
   - In `src/routes/auth.tsx`, before calling `supabase.auth.signUp` / `signInWithPassword`:
     - `trim()` and `toLowerCase()` the email (Supabase lowercases server-side, but trimming kills trailing spaces from autofill).
     - Run a lightweight typo check against a small allow-list of common providers (`gmail.com`, `googlemail.com`, `outlook.com`, `hotmail.com`, `icloud.com`, `yahoo.com`, `live.com`, `me.com`, `aol.com`, `protonmail.com`).
     - If the domain isn't in the list but is within Levenshtein distance 1 of one of them (e.g. `mail.com` vs `gmail.com`, `gnail.com`, `outlok.com`), show a non-blocking inline confirmation: "Did you mean **gibsonscott005@gmail.com**? [Use suggested] [Keep typed]". No external API, no extra dependency — a 30-line helper.
   - This stops the same `mail.com`/`gmail.com` split happening to anyone else without being so strict it rejects legitimate corporate domains.

4. **Surface the active email in the shell header tooltip.**
   - In `src/components/dashboard-shell.tsx`, add `title={user?.email}` to the account-type chip so hover/long-press on any page reveals which account is active. One-line change, helps landlord users too.

5. **One-off cleanup for the existing duplicate (optional, ask user).**
   - Do **not** auto-merge in code. After deploying, I can either:
     - Delete the `gibsonscott005@mail.com` auth user (and its empty `profiles` row) via a one-off `supabase--insert` migration so the user can only sign in to the real account, **or**
     - Leave both accounts and let the new typo guard + visible email make the situation self-correcting.
   - I'll confirm which they want before touching auth data.

## Files touched

- `src/routes/_authenticated/dashboard.index.tsx` — visible identity row, diagnostic empty-applications card.
- `src/routes/auth.tsx` — email normalisation + domain typo suggestion before submit.
- `src/components/dashboard-shell.tsx` — `title` attribute on the account-type chip.

## Out of scope

- Changes to `passport_shares` RLS, the two-step share query, or focus-refetch — verified working for the real account.
- Landlord dashboard (the same email-visibility one-liner in the shell covers it).
- Any merging of `passport_shares` rows between the two accounts (would require user confirmation and a privileged migration).
