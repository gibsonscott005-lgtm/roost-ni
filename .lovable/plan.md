# Critical-Path E2E Walkthrough — Plan

Drive Playwright against `http://localhost:8080` with both test accounts and capture one screenshot per state. Deliverable: single report with URL, screenshot filename, observed state, and any console errors.

## Accounts
- Tenant: `gibsonscott005@gmail.com` / `Roost-Test-2026!xK9`
- Landlord: `usgibsons2004@gmail.com` / `Roost-Test-2026!xK9`

## Setup (one-off, before the run)
1. Seed a **fresh listing** on the landlord account so we can walk Apply → Accept → Issue → Sign → Counter-sign without touching the existing `36 Main Road` tenancy (which is already fully executed and would short-circuit the flow).
2. Store all screenshots under `/tmp/browser/walkthrough-b/shots/`.

## Flow to exercise

```text
Tenant                                Landlord
------                                --------
1. /listings                          
2. /listings/:id  → Apply             
                                      3. /dashboard/applications → Accept
                                      4. /landlord/issue-lease?share=… → Issue
5. /tenant/review-lease?share=… → Sign
                                      6. /dashboard/applications → Counter-sign
                                      7. /landlord/manage-tenancy?share=…
                                         └─ Maintenance tab: respond + resolve
8. /tenant/tenancy?share=…
   └─ Maintenance tab: report issue + upload photo
                                      9. Notifications bell shows new event
10. Notifications bell shows resolution
```

## Steps (each = one Playwright script + screenshot + assert)

| # | Role | Route | Action | Assert |
|---|------|-------|--------|--------|
| 1 | tenant | `/listings` | grid renders | ≥1 card, no console error |
| 2 | tenant | `/listings/:id` | click **Apply with Passport** | success toast, button disables |
| 3 | tenant | `/listings/:id` (retry) | click Apply again | duplicate-prevention toast |
| 4 | landlord | `/dashboard/applications` | new share appears, click **Accept** | status → "Accepted", listing → "Under Offer" |
| 5 | landlord | `/dashboard/applications` | click **Issue Lease** on accepted card | navigates to `/landlord/issue-lease?share=…` |
| 6 | landlord | `/landlord/issue-lease` | Roost template preview shows tenant/rent/address, toggle Fair Fuel, click **Issue** | lease_status → `issued`, toast |
| 7 | tenant | `/dashboard` | banner: "Lease ready to review" with Sign button | link present |
| 8 | tenant | `/tenant/review-lease?share=…` | type signature, submit | lease_status → `signed_pending_landlord` |
| 9 | landlord | `/dashboard/applications` | "Tenant signed" badge, click **Counter-sign** | lease_status → `counter_signed`, toast |
| 10 | landlord | `/dashboard` | property card shows blue **Let Agreed** + **Manage Tenancy** button | badge + button present |
| 11 | landlord | `/landlord/manage-tenancy?share=…` → **Maintenance** tab | empty state | renders |
| 12 | tenant | `/tenant/tenancy?share=…` → **Maintenance** | report issue "Boiler pilot out", urgency=high, upload sample photo | ticket appears in list, signed URL loads |
| 13 | landlord | `/landlord/manage-tenancy?share=…` → **Maintenance** | ticket visible, change status to *In progress*, then *Resolved* | status pill updates, notifications emitted |
| 14 | tenant | any authed route | open notifications bell | at least one unread `maintenance_updated` / `maintenance_resolved` insert visible |
| 15 | landlord | any authed route | open notifications bell | unread `maintenance_reported` visible |

## Failure handling
- If any step throws or the screenshot doesn't match expectation, stop that lane and record: route, action, expected vs observed, console log tail, network response for the failing request.
- Do **not** attempt fixes inside this walkthrough — report only. Fixes go into a follow-up plan.

## Deliverable
Single markdown report at the end of the run:
- ✅/❌ per step with screenshot filename
- Console errors grouped by route
- Any RLS or 4xx/5xx network failures seen
- List of recommended fixes (if any) — no code changes without approval

## Out of scope for this pass
- Passport wizard inputs (already validated in prior turns)
- `/listings` visual polish
- Add Property form (covered in a separate landlord-onboarding pass if requested)
- Full realtime timing tests beyond confirming the row appears
