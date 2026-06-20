## Plan

1. Update the tenant dashboard card on `/dashboard` so **Complete my passport** navigates reliably to `/dashboard/passport/edit` when tapped.
2. Keep the working **View passport** and **Browse properties** links unchanged.
3. Refresh the outdated card copy that says the editor is “being built” so it matches the current working passport editor.
4. Verify in the live preview that the flow works:
   - `/` → **Build Your Tenant Passport** opens the edit page
   - `/dashboard` → **Complete my passport** opens the edit page
   - URL changes to `/dashboard/passport/edit` and the editor renders

## Technical approach

- Change only `src/routes/_authenticated/dashboard.tsx`.
- Use TanStack navigation from the dashboard route for the broken CTA rather than relying on the current `<Link>` that is being swallowed in this card.
- Do not change database rules, authentication, passport form logic, or the listing buttons.