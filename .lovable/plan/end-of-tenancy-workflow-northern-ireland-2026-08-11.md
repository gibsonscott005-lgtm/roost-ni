# End-of-Tenancy Workflow (Northern Ireland)

Close the loop on a tenancy: serve or receive a valid NI Notice to Quit, run a final inspection against the move-in inventory, settle the deposit, and return the property to the market — with both sides seeing the same status at every step.

## Northern Ireland rules the build enforces

Notice to Quit lengths are set by the Private Tenancies Act (NI) 2022 and are calculated from the tenancy start date:

```text
Landlord serving tenant
  tenancy 12 months or less .................. 4 weeks' notice
  more than 12 months, up to 10 years ........ 8 weeks' notice
  more than 10 years ......................... 12 weeks' notice

Tenant serving landlord
  tenancy 10 years or less ................... 4 weeks' notice
  more than 10 years ......................... 12 weeks' notice
```

Also built in:
- Notice must be in writing, dated, name the property and give the date the tenancy ends. Roost generates a printable notice containing all of this.
- The notice period runs from the date the notice is received, so the earliest valid end date is auto-calculated and an earlier date cannot be chosen.
- Deposit must be returned, or deductions agreed, within 28 days of the tenancy ending, with the protecting scheme named and the dispute route explained.
- Fair Fuel "empty-in, full-out" reconciliation for oil properties: the move-in oil level is carried into the final inspection.
- Roost assists, it never decides. No automated eviction advice and no verdict on deductions — every notice screen carries a plain-English reminder that Roost does not give legal advice and that only a court can order possession.

## What gets built

**1. Notice to Quit (both sides)**
- New "Ending tenancy" tab on the landlord tenancy workspace and the tenant tenancy workspace.
- Serve notice form: who is serving, date served, optional reason, auto-calculated notice length and earliest valid end date, confirmed end date.
- Generates a printable NI Notice to Quit from the tenancy data (parties, address, tenancy start, notice length, end date).
- The receiving party sees the notice in their workspace, opens the same document and acknowledges receipt.
- Countdown card: "Tenancy ends in X days".

**2. Final inspection**
- Rebuilds the move-in inventory room by room with an end-of-tenancy condition, notes and photo per item, plus final meter readings and oil level where the property uses oil.
- Landlord submits; tenant reviews and either agrees or flags items in dispute, matching the existing move-in sign-off pattern.

**3. Deposit settlement**
- 28-day countdown from the tenancy end date.
- Landlord records a full return or itemised proposed deductions (amount plus reason); tenant agrees or disputes.
- Captures the scheme dispute reference when disputed, and the date and method of the return.

**4. Close out**
- Once the end date has passed and settlement is recorded, the landlord marks the tenancy complete: the property returns to available (or stays off-market by choice), the tenancy becomes a read-only archive, and both dashboards move it into "Past tenancies".
- The Documents tab keeps the lease, notice, final inspection and settlement accessible after close out.

**5. Notifications**
- New alerts: notice served, notice acknowledged, final inspection submitted, inspection agreed or disputed, settlement proposed, deposit returned, 28-day deadline approaching, tenancy completed. All respect existing notification preferences.

## Technical notes

- Database: new `tenancy_notices` table (share_id, served_by, served_on, notice_weeks, end_date, reason, acknowledged_at) and `tenancy_deposit_settlements` table (share_id, itemised deductions JSONB, proposed and agreed amounts, tenant response, scheme dispute reference, returned_at); `final_condition`, `final_notes` and `final_photo_path` columns added to `tenancy_inventory_items`; `tenancy_status` column on `passport_shares` (`active`, `notice_served`, `ended`, `completed`). RLS scoped to the tenancy's two parties, with GRANTs.
- New `notification_type` enum values for the alerts above.
- Notice-period maths and NI legal copy live in one shared module (`src/lib/tenancy-end.ts`) used by both workspaces and the document generator, so the rules exist in a single place.
- Notice and settlement documents reuse the existing printable-HTML pattern and escaping used by the lease generator.
- Final inspection photos reuse the existing private tenancy documents bucket.