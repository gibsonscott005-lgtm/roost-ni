# Tenant application withdrawal

Tenants can currently apply to a property but never take it back. This adds a clear withdrawal step for applications, matching how the major UK rental portals behave: withdrawing is allowed at any point before a lease is issued, and the tenant may apply to the same property again later.

## What the tenant sees

- On a property they've applied to (`/listings/:id`) and on each application row in their dashboard, a **Withdraw application** action appears while the application is pending or reviewed.
- Withdrawing asks for confirmation ("The landlord will no longer see your passport for this property") and takes an optional short reason.
- After withdrawing, the row shows a muted **Withdrawn** badge with the date, and the property page shows **Apply again** so they can re-submit.
- Withdrawal is blocked once a lease has been issued or signed. The tenant is pointed to the lease screen instead, with a message explaining that they need to decline or end the tenancy through the lease flow rather than withdraw. (Declining an issued lease is separate work — not in this change.)

## What the landlord sees

- A withdrawn application drops out of the active applicants list and moves into a **Withdrawn** group showing the tenant name, the date, and the reason if given. Passport details are no longer viewable for that application.
- The landlord gets a notification: "Applicant withdrew their application".
- If the withdrawn applicant was the accepted one and no lease has been issued, the property returns from **Under offer** to **Available**, and the notification says so.

## Re-applying (industry standard)

Portals such as OpenRent and Rightmove treat a withdrawal as a clean exit — the tenant can apply again if the property is still available. Roost does the same: no cooldown, no block. The application record is reused, so the landlord sees an honest history ("Re-applied 12 Aug, previously withdrawn 3 Aug") rather than duplicate entries.

## Technical notes

- Migration: add `withdrawn` to the `share_status` enum; add `withdrawn_at timestamptz`, `withdrawn_reason text`, and `withdraw_count integer not null default 0` to `passport_shares`. The existing unique `(tenant_id, listing_id)` constraint stays, so re-applying updates the same row.
- New `src/lib/application-withdraw.functions.ts` with two auth-protected server functions:
  - `withdrawApplication({ shareId, reason })` — verifies the caller owns the share and that `lease_status` is null, sets the withdrawn fields, reverts the listing from `under_offer` to `available` when that share was the accepted one, and emits the landlord notification.
  - `reapplyApplication({ shareId })` — verifies ownership and withdrawn state, checks the listing is still published and not under offer, resets to `pending` with a fresh `shared_at`, increments `withdraw_count`, and notifies the landlord.
  Server-side keeps the listing-status revert and notification atomic rather than trusting the client.
- RLS: replace the broad tenant UPDATE policy on `passport_shares` with one that prevents tenants setting `status = 'accepted'` themselves; withdrawal and re-apply go through the server functions.
- UI touch points: `src/routes/listings.$id.tsx` (ApplyCard), `src/routes/_authenticated/dashboard.index.tsx` (application rows and counts), `src/routes/_authenticated/dashboard.applications.tsx` (landlord grouping), and `StatusPill` gains a withdrawn variant. Counts that currently treat "not accepted / not rejected" as pending exclude withdrawn applications.