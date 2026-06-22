## Plan

Fix the tenant dashboard links that still point to `/`, because `/` now redirects to `/auth` and causes the sign-in/homepage flash.

1. Update `src/routes/_authenticated/dashboard.index.tsx`
   - Change the tenant dashboard **View passport** button from `to="/"` to `to="/dashboard"`.
   - This is the exact button shown in your screenshot.

2. Update `src/components/dashboard-shell.tsx`
   - Change the Roost logo/home icon link from `to="/"` to `to="/dashboard"` while signed in.
   - Change the tenant sidebar text/link from “home view” pointing to `/` to dashboard/passport wording pointing to `/dashboard`.

3. Verify
   - Click **View passport** from `/dashboard` and confirm it stays on the tenant dashboard instead of flashing `/auth`.
   - Confirm **Complete my passport** still opens `/dashboard/passport/edit`.