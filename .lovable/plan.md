# Make the beta and help content reachable

## What's actually there

- `/beta` exists and works (onboarding page: what Roost is, tenant/landlord paths, what to test, ground rules).
- The in-app feedback widget and dismissible beta banner exist and are mounted.
- There is **no** `/help` or FAQ page — that was described in the earlier plan but never built.
- Nothing links to `/beta`. `/` redirects straight to `/auth`, and the sign-in page has no link to it, so unless someone types the URL they never see it.

## What this will do

1. **Build a public `/help` page** with:
   - Getting started for tenants (passport steps, applying, tracking).
   - Getting started for landlords (adding a property, NI registration number, reviewing applicants, issuing a lease, deposit protection).
   - FAQ: what self-certified means, why Roost never approves or decides, Fair Fuel same-level-out policy, deposit 28-day rule, statutory notice periods, what's simulated during beta (no payments).
   - "Still stuck?" block pointing at the in-app Feedback button.

2. **Link it everywhere it's needed**
   - Header link on `/beta` and `/auth`.
   - "Help" item in the signed-in dashboard sidebar/nav.
   - "How to test" link in the beta banner points at `/beta`; a Help link points at `/help`.

3. **Add a footer link to `/beta`** on `/auth` so testers landing on the sign-in screen can read the beta brief first.

## Technical notes

- New file `src/routes/help.tsx` (public route, own `head()` with title/description/og tags).
- Small edits to `src/routes/auth.tsx`, `src/routes/beta.tsx`, `src/components/dashboard-shell.tsx`, `src/components/beta-feedback.tsx` for links.
- Content only — no schema, no new dependencies, no logic changes. British English throughout.

## Size

Small. One new page plus navigation links.
