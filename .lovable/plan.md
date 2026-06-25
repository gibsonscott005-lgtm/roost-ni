## Problem

Tenant `gibsonscott005@gmail.com` has 1 `passport_shares` row with `status = 'accepted'` against a published listing, RLS allows the tenant to read it, but the dashboard stat cards stay at **0 sent / 0 accepted**.

The single Supabase call powering both the stats and the "Your applications" list embeds the listing in one go:

```ts
.from("passport_shares")
.select("id, status, shared_at, listing:property_listings!listing_id(id, title, address, location, monthly_rent)")
.eq("tenant_id", user.id)
```

If the embed throws for any reason (PostgREST hint mismatch, schema cache lag after a migration, a future RLS change on `property_listings`, etc.) `data` comes back `null`, the `error` is destructured but never surfaced, and the counters silently stay at zero. There's no toast, no console error, no fallback — so the same silent-zero bug will hit every future sign-up.

## Fix

Make the share counts independent of the listing embed and make failures visible.

1. **Split the query into two steps** in `src/routes/_authenticated/dashboard.index.tsx` (`TenantDashboard`):
   - Step A: `passport_shares` → `id, status, shared_at, listing_id` only. This drives `applicationCounts` and `acceptedShares.length` so the stat cards always reflect what RLS returns.
   - Step B: with the `listing_id`s from step A, fetch `property_listings` (`id, title, address, location, monthly_rent, status`) via a second `.in('id', ids)` query. Merge into the share rows for display.
2. **Surface errors** from both queries with a `toast.error` (matching the existing passport `describeDbError` pattern) instead of silently swallowing them, so any future regression is obvious instead of showing "0 sent" forever.
3. **Tolerate missing listings**: if step B returns nothing for an id (e.g. unpublished/removed), keep the share row, label it "Listing unavailable", and still count it in `sent` / `accepted`.
4. **Re-run on focus / after returning from a listing**: add a lightweight refetch when the tab regains focus (`window` `focus` event) so accepting an offer in another tab updates the tenant view without a hard reload. Cheap and avoids the "I accepted but my dashboard still says 0" class of bug.

No schema changes, no RLS changes — the data and policies are already correct.

## Files touched

- `src/routes/_authenticated/dashboard.index.tsx` — `TenantDashboard` data-loading block and applications list rendering.

## Out of scope

- Landlord "Received passports" counter (already uses a separate `count: 'exact'` query and is working).
- Any visual redesign of the stat cards or the applications list added last turn.
