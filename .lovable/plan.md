## What's happening

`useAuth` (in `src/hooks/use-auth.ts`) calls `setUser` on **every** Supabase auth event — including `INITIAL_SESSION` on mount and `TOKEN_REFRESHED` (fires hourly and on every tab focus). Each event hands React a brand-new `user` object reference.

In `src/routes/_authenticated/dashboard.tsx` the data-loading effect depends on the `user` reference:

```tsx
useEffect(() => {
  if (!user) return;
  loadListings();
  if (isLandlord) { /* fetch passport_shares count */ }
}, [user, isLandlord]);
```

So every auth event re-runs `loadListings()`, which calls `setListings(...)` and `setLoading(false)`. The whole `TenantDashboard` subtree re-renders mid-tap, and on slower mobile the `<Link to="/dashboard/passport/edit">` click never reaches the router — that matches what you see (URL doesn't change, button feels dead). This is the same root cause that broke the passport editor inputs.

## Fix

Two small, surgical changes — frontend only, no DB, no business logic.

### 1. `src/hooks/use-auth.ts` — only react to real identity transitions

- Filter `onAuthStateChange` to `SIGNED_IN`, `SIGNED_OUT`, `USER_UPDATED`. Ignore `INITIAL_SESSION`, `TOKEN_REFRESHED`, `PASSWORD_RECOVERY`, etc.
- Inside the handler, only call `setUser`/`setSession` when the user id actually changed (compare against the previous state) so re-subscribes don't churn the reference.
- Keep the initial `getSession()` bootstrap as the single source for first mount.

### 2. `src/routes/_authenticated/dashboard.tsx` — stable effect deps

- Change `useEffect(..., [user, isLandlord])` to `useEffect(..., [user?.id, isLandlord])`.
- Move `setLoading(false)` so it only flips on the first successful load (don't re-toggle on background refetches), matching the pattern used for the passport editor.

## Verify

After the edits, run Playwright headless against `localhost`:

1. Restore the Supabase session from the sandbox env vars.
2. Navigate to `/dashboard`, screenshot.
3. Click **Complete my passport**, wait for navigation.
4. Assert `page.url()` ends with `/dashboard/passport/edit` and screenshot the editor.

Stops here if the URL changes and the editor renders.

## Out of scope

- No changes to routing, RLS, or the passport editor itself.
- No redesign of the dashboard card or its other buttons.
