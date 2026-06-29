# Tenancy Management Workspace

New route `/landlord/manage-tenancy?share={id}` opened from the "Manage Tenancy" button on let-agreed property cards and from `/landlord/issue-lease` after a lease is counter-signed. Loads the executed `passport_shares` row + tenant + listing.

## Tabs (radix `Tabs`, four panels, sticky header summary)

Header summary above the tabs: tenant name, property address, monthly rent, deposit, lease commencement date, "Lease executed" badge.

### Tab 1 — Overview & Rent Ledger

**Move-In Funds Tracker** (two cards, side-by-side on desktop):
- Security Deposit — £{deposit}
- First Month's Rent — £{monthly_rent}

Each card shows a status pill that transitions:
`Awaiting Payment` → `Pending Landlord Verification` → `Paid & Verified`.

Landlord-side actions per card:
- "Confirm Funds Received" button (enabled once status is `pending_verification`).
- Payment method selector inside the confirm flow: Bank Transfer / Cash / Standing Order.
- If method = Cash, on confirm show an emerald notice: "Statutory cash receipt generated and issued to the tenant under the Private Tenancies Act NI 2022." A receipt row is recorded in `tenancy_receipts`.

Tenant-side trigger ("mark as sent") is out of scope for this milestone — landlord can also flip status forward manually to simulate the tenant action in the prototype, with a small "Simulate: tenant marked as sent" link.

Below trackers: rolling **Rent Ledger** table (date, amount, method, status, receipt link). Seeded with the deposit + first month rows; empty state otherwise.

### Tab 2 — Deposit Protection

- Visual 28-day countdown clock (circular SVG ring) anchored on `lease_signed_at` (counter-signed timestamp). Shows days/hours remaining; turns amber <7 days, red when overdue.
- Scheme selector: TDS NI / MyDeposits NI / LPS NI.
- Text input for **Scheme Certificate Number** + "Save certificate" button.
- Once saved, the countdown card flips to a green "Deposit protected" state showing scheme + cert + date logged.

### Tab 3 — Inventory & Utilities

- Room-by-room condition checklist. Default rooms: Living Room, Kitchen, Bathroom, Bedroom 1, Bedroom 2, Hallway/Exterior. Landlord can add custom rooms. Each row: condition (Excellent / Good / Fair / Poor), notes textarea, optional photo upload to `tenant_documents/{share_id}/inventory/`.
- **Domestic Heating Oil Handover Gauge**: large SVG fuel gauge (semi-circular dial with needle) and five selectable level chips: Full, 3/4, 1/2, 1/4, Empty. Selected level updates the needle. Emerald info strip reminding of Fair Fuel "Empty-In / Full-Out" if the listing had that toggle on.
- "Save handover record" persists the gauge level + checklist snapshot.

### Tab 4 — Documents

- Download card: "Roost Standard NI Tenancy Agreement (Executed)" — generates a printable HTML view (re-uses the template from `landlord.issue-lease`) with both signatures + download as PDF via `window.print()` for the prototype.
- Placeholder card: "Generate Statutory Tenancy Information Notice" — disabled button with "Coming soon — auto-fills Private Tenancies Act NI 2022 disclosures" helper text.
- Card listing the signed lease metadata (tenant signature name, signed-at, counter-signed-at).

## Data model (single migration)

Add to `passport_shares`:
- `deposit_status` text default `'awaiting'` (`awaiting` | `pending_verification` | `verified`)
- `rent_status` text default `'awaiting'`
- `deposit_payment_method` text
- `rent_payment_method` text
- `deposit_scheme` text
- `deposit_cert_number` text
- `deposit_protected_at` timestamptz
- `oil_handover_level` text (`full`|`three_quarter`|`half`|`quarter`|`empty`)
- `inventory_completed_at` timestamptz

New tables:
- `tenancy_receipts` (id, share_id FK, kind `deposit`|`rent`|`other`, amount, method, issued_at, statutory_cash boolean, notes)
- `tenancy_inventory_items` (id, share_id FK, room, condition, notes, photo_path, sort_order)

All with `created_at`/`updated_at`, GRANTs to authenticated + service_role, RLS scoped so the landlord (`property_listings.landlord_id = auth.uid()`) and the tenant (`passport_shares.tenant_id = auth.uid()`) of the parent share can read; only the landlord can write. Update triggers via existing `update_updated_at_column()` helper.

## Entry points

- `dashboard.index.tsx` "Manage Tenancy" link → update from `/landlord/issue-lease?share=` to `/landlord/manage-tenancy?share=`.
- `dashboard.applications.tsx` "Lease fully executed" badge row → add a small "Manage tenancy" button next to it.
- `landlord.issue-lease.tsx` once `lease_status === 'counter_signed'` → primary CTA becomes "Open tenancy workspace" linking to the new route.

## Technical notes

- New file: `src/routes/_authenticated/landlord.manage-tenancy.tsx` using `DashboardShell`, shadcn `Tabs`, existing semantic tokens (`bg-verified`, `bg-surface`, emerald accents). British English copy throughout, no hardcoded colors outside tokens.
- Countdown clock + fuel gauge: inline SVG components in the same file (no new deps).
- Reuses TanStack Query patterns from `dashboard.applications.tsx`; mutations invalidate `['tenancy', shareId]` plus `['landlord-applications']`.
- Receipt "PDF" is an in-app printable modal for the prototype — no PDF library added.
