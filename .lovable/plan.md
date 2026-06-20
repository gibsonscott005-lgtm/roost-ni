## Problem

On `/dashboard/passport/edit`, typing into any input has no effect. The fields look enabled but never accept characters.

Root cause: the page's load effect re-runs on every auth event and toggles a global `loading` state, which unmounts the step form (`IdentityStep` / `IncomeStep` / `ReferencesStep`). Because the field values live in `useState` inside those child components, every remount throws the typed value away — faster than React can paint it. `useAuth()` produces a new `user` object on `INITIAL_SESSION`, `TOKEN_REFRESHED`, and tab focus, so the loop is effectively continuous.

## Fix (frontend only, single file)

Edit `src/routes/_authenticated/dashboard.passport.edit.tsx`:

1. Key the load effect on `user?.id` instead of the `user` object reference, so it only fires when the signed-in user actually changes.
2. Stop unmounting the form on background refetches: only show the full-page spinner on the very first load (when `passport` is still `null`). Subsequent refreshes update `passport` in place without flipping `loading` back to `true`.
3. Lift the editable field state out of the step components into the parent (or seed the children with a stable `key={passport.user_id}` plus a `useEffect` that syncs only when `passport.user_id` changes), so a fresh `passport` object from a benign refetch doesn't blow away in-progress edits.

No database, RLS, or business-logic changes. No other routes touched.

## Verification

- Open `/dashboard/passport/edit`, type into Document number, Annual income, and the reference name/email/phone fields — characters persist.
- Switch tabs away and back (forces `TOKEN_REFRESHED`); typed values remain.
- Save & continue on each step still writes to `tenant_passports` and advances the stepper.
