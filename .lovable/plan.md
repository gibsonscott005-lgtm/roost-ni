## Plan

Add the interactive glue between the two prototype screens. All visual-only, no backend.

### 1. Shared `ViewSwitcher` segmented control
- New file `src/components/view-switcher.tsx` exporting a single small component.
- Pill-shaped segmented toggle: two options — `Tenant Passport` and `Landlord Listing`.
- Active segment uses `bg-surface` + subtle shadow on a `bg-surface-muted` track; inactive is muted text. Matches existing pill/card aesthetic exactly (no new colours, same border-radius + border tokens).
- Uses TanStack `<Link to>` for both segments and reads `useRouterState` to know which is active — so it works as real navigation AND highlights correctly on each route.
- Placed at the very top of `<main>` on both pages, above `PageIntro`, centered, mobile-first (full-width pill on mobile, auto width on `sm:`).

### 2. Tenant Passport success toast
- Use `sonner` (already wired in the project root). Import `toast` from `sonner`.
- Wire the existing "Share Passport to Landlord" button in `ShareBar` (`src/routes/index.tsx`) to an `onClick` that fires:
  - `toast.success("Passport shared successfully", { description: "Landlord James Murphy has received your verified compliance data." })`
- Keep button styling identical. Add a tiny pressed-state via `active:scale-[0.99]` if not already present.

### 3. Landlord listing success banner
- Inline success banner inside `src/routes/landlord.listing.tsx` — not a toast — so the form view feels like it transitioned to a "published" state.
- Local state `published: boolean` in `LandlordListing`. The "Generate Compliant NI Listing" button calls `setPublished(true)`.
- When `published` is true, render a new `<PublishedBanner />` at the top of `<main>` (just under the `ViewSwitcher`):
  - Rounded card, `border-verified/30 bg-verified-soft/60`, `ShieldCheck`/`Sparkles` icon in verified emerald.
  - Heading: `Listing Live`
  - Body: `Ready to receive verified NI Tenant Passports.`
  - Small ghost "Dismiss" button on the right to reset state (so the prototype is replayable).
- Bottom CTA stays visible; once published its label swaps to `Listing published` with a `Check` icon and `disabled` styling, so the cause/effect is obvious.

### 4. Cleanup
- Remove the two ad-hoc `For landlords →` / `Tenant view →` pills added in the previous milestone — the new `ViewSwitcher` replaces them.
- Confirm `sonner`'s `<Toaster />` is mounted at the root; if not, add it to `src/routes/__root.tsx` inside `RootComponent` so the toast renders on every route.

### Files touched
- `src/components/view-switcher.tsx` — new.
- `src/routes/index.tsx` — mount switcher, remove old pill, wire share button to `toast.success`.
- `src/routes/landlord.listing.tsx` — mount switcher, remove old pill, add `published` state + `<PublishedBanner />`, swap CTA label when published.
- `src/routes/__root.tsx` — ensure `<Toaster richColors position="top-center" />` from `sonner` is rendered (only if missing).

### Verification
After implementing I'll flush HMR, open the preview at `/` and `/landlord/listing`, click both CTAs, and confirm the toast + banner render and the switcher highlights the active route on each side.
