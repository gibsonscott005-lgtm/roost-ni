## Fix passport editor navigation

**Root cause:** After making `/auth` the landing page, `/` now redirects to `/auth`. The passport editor still links back to `/`:
- The "View passport" button (top-right) → `to="/"`
- The final `navigate({ to: "/" })` after completing references step

Both send the user to `/auth` instead of the dashboard.

**Change (single file: `src/routes/_authenticated/dashboard.passport.edit.tsx`):**

1. Update the "View passport" `<Link>` from `to="/"` → `to="/dashboard"`.
2. Update the post-completion `navigate({ to: "/" })` → `navigate({ to: "/dashboard" })`.

No other files, no logic, no styling changes.
