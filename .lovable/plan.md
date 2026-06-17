## What's happening

The "flash then disappears" comes from a TanStack Router hydration error logged in the console:

`Invariant failed: Expected to find a match below the root match in SPA mode.`

This fires when the SSR shell renders for `/landlord/listing`, the dev server then HMR-reloads (the log also shows `[vite] server connection lost. Polling for restart...`), and the client hydrates against a route tree that isn't fully in sync yet. The page paints for a moment, then the error overlay unmounts it.

The route file and generated route tree are both correct (`src/routes/landlord.listing.tsx` → `/landlord/listing`), so this is a transient hydration glitch caused by typing the URL directly after a hot reload, not a real bug in the page.

## Plan

1. **Add a "Switch view" pill to the header on both pages** so the user never has to manually type `/landlord/listing` again — which also avoids the cold-hydrate path that triggers the overlay.
   - On `src/routes/index.tsx` (Tenant Passport): small link top-right next to the avatar — `For landlords →` linking to `/landlord/listing`.
   - On `src/routes/landlord.listing.tsx`: matching link — `Tenant view →` linking to `/`.
   - Style: tiny pill, `border border-border bg-surface-muted`, muted text, hover lifts to `bg-secondary`. Matches existing minimal aesthetic, no new colours.
   - Uses TanStack `<Link to=...>` (client-side nav, no SSR re-entry).

2. **Force a clean dev-server restart** after the edit so the route tree, Vite module graph, and SSR bundle are all consistent. This clears the stale hydration state that's causing the flash.

3. **No changes to** colours, typography, card layout, form fields, business logic, or `__root.tsx` / `router.tsx`. Pure presentation addition.

## Files touched

- `src/routes/index.tsx` — add header link to `/landlord/listing`.
- `src/routes/landlord.listing.tsx` — add header link back to `/`.

## After implementing

I'll reload the preview at `/landlord/listing` to confirm the page stays mounted and the overlay no longer appears, then verify the round-trip nav works from the Tenant Passport.
