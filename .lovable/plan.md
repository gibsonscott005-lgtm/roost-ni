## Property Details + Passport Sharing Flow

### 1. New table — `passport_shares` (migration)

```sql
CREATE TYPE public.share_status AS ENUM ('pending', 'reviewed', 'accepted');

CREATE TABLE public.passport_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.property_listings(id) ON DELETE CASCADE,
  status public.share_status NOT NULL DEFAULT 'pending',
  shared_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, listing_id)
);

GRANT SELECT, INSERT, UPDATE ON public.passport_shares TO authenticated;
GRANT ALL ON public.passport_shares TO service_role;

ALTER TABLE public.passport_shares ENABLE ROW LEVEL SECURITY;
```

RLS policies:
- **Tenants insert own shares**: `INSERT` with check `auth.uid() = tenant_id`.
- **Tenants view own shares**: `SELECT` using `auth.uid() = tenant_id`.
- **Landlords view shares to their listings**: `SELECT` using `EXISTS (SELECT 1 FROM property_listings p WHERE p.id = listing_id AND p.landlord_id = auth.uid())`.
- **Landlords update status on their listings**: `UPDATE` using same EXISTS check (for marking reviewed/accepted later).

The unique `(tenant_id, listing_id)` constraint prevents duplicate applications.

### 2. Remove demo cards from `/listings`

Delete `DEMO_LISTINGS` and its usage from `src/routes/listings.tsx`. The feed will render only real database rows returned by the `property_listings` query. No placeholder cards remain.

### 3. New route — `src/routes/listings.$id.tsx` (Property Details)

- `createFileRoute("/listings/$id")`, public route, SSR-friendly.
- Loader fetches the listing via the public Supabase client (`is_published = true` + `eq id`); throws `notFound()` if missing.
- Sets per-listing `head()` (title, description, og tags) derived from listing data.
- Includes `errorComponent` and `notFoundComponent`.
- Layout: same header as `/listings`, hero (title, address, postcode), price + Fair-Fuel badge, a "NI Compliance" details card listing Heating type, Empty-in / Full-out fuel agreement (Yes/No), NI Landlord Reg Number, Deposit, Tenant preferences chips.
- **Conditional CTA** (in a component using `useAuth`):
  - **Not signed in** → emerald button "Sign in to apply" linking to `/auth`.
  - **Tenant** → emerald button "Apply with Tenant Passport" → on click inserts into `passport_shares` `{ tenant_id: user.id, listing_id }`. On unique-violation, show toast "Already applied". On success, toast "Passport shared successfully — landlord has received your verified data" and swap button to disabled "Application sent" pill.
  - **Landlord** → CTA hidden, replaced by neutral note "You're viewing as a landlord."

### 4. Listings cards — link to details

In `src/routes/listings.tsx`, replace the static `<button>View details</button>` with `<Link to="/listings/$id" params={{ id: listing.id }}>` styled identically.

### 5. Landlord Inbox — `src/routes/_authenticated/dashboard.applications.tsx`

Add a third sidebar item "Received passports" that routes to `/dashboard/applications` so it can be deep-linked from a future notification.

- Add sidebar item "Received passports" in `dashboard.tsx`.
- New file `src/routes/_authenticated/dashboard.applications.tsx`:
  - Reuses the same header + sidebar shell (extracted — see Technical notes).
  - Queries: `passport_shares` joined with `profiles` (tenant name) and `tenant_passports` (verification flags) and `property_listings` (title). Single query using PostgREST embed:
    ```ts
    supabase.from("passport_shares").select(`
      id, status, shared_at,
      tenant:profiles!tenant_id ( id, full_name ),
      listing:property_listings!listing_id ( id, title, landlord_id ),
      passport:tenant_passports!tenant_id ( identity_verified, income_verified, reference_verified, right_to_rent_verified )
    `).order("shared_at", { ascending: false });
    ```
    RLS already scopes to landlord's listings, so no extra filter needed.
  - Render a table/list: Tenant name · Listing title · "Shared 2h ago" · 4 verification badges (green check / gray pending) · status pill · "View Full Passport" button (placeholder — opens a modal showing the four verification statuses, net income, heating prefs, and an "Accept" button that updates `status` to `'accepted'`).

### 6. Sidebar update on `/dashboard`

Add "Received passports" item to `dashboard.tsx` sidebar (landlord only). For tenants, no change.

### Technical notes

- Tenant passport embed via `tenant_passports!tenant_id` requires the FK to be on `user_id` — current schema has `user_id uuid NOT NULL`. The relationship name in PostgREST is auto-derived; if the embed name fails, fall back to two parallel queries (one for shares, one for `tenant_passports` keyed by tenant_id) and merge client-side.
- All Supabase calls stay on the browser client (RLS-enforced).
- Sidebar shell: extract a small `DashboardShell` wrapper exporting `<Header />` + sidebar nav, used by both `dashboard.tsx` and `dashboard.applications.tsx`. Keeps styling identical without duplicating ~120 lines.
- Styling stays within existing tokens (`bg-verified`, `bg-verified-soft`, `text-verified`, `border-border`, `bg-surface`, `bg-surface-muted`). No new colours.
- British English copy throughout ("Verified", "Shared", "Applicant").
- No payments, no email — purely in-app state.

### Files

Create:
- `supabase/migrations/<timestamp>_passport_shares.sql`
- `src/routes/listings.$id.tsx`
- `src/routes/_authenticated/dashboard.applications.tsx`
- `src/components/dashboard-shell.tsx` (extracted header + sidebar)

Edit:
- `src/routes/listings.tsx` — remove `DEMO_LISTINGS`, add View Details link.
- `src/routes/_authenticated/dashboard.tsx` — use new shell, add "Received passports" sidebar entry.

Out of scope this milestone: messaging, accept/reject UX beyond a simple status flip, email notifications, viewing the tenant passport edits themselves.