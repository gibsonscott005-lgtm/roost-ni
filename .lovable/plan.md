# Items 3, 4 and 5 — rent ledger, listing management, deposit certificate

Three remaining pieces of the approved list. Everything below reuses columns that already exist in the database (`tenancy_start_date`, `due_date`, `period_label` on receipts, `deposit_cert_path` on the tenancy record), so the only database change needed is two new notification types.

## 3. Ongoing rent ledger and arrears

Today the ledger only records the deposit and the first month's rent, then goes quiet.

- **Tenancy start date.** The landlord sets the move-in date on the Overview tab (defaulting to the lease signature date). This anchors the whole schedule.
- **Monthly schedule.** A rolling 12-month table is generated from that date — one row per month with a due date and a period label such as "Sep 2026".
- **Per-month state.** Paid (a receipt exists), Due (this month, not yet paid), Upcoming, or Overdue (due date passed with no receipt).
- **Log a payment.** Each unpaid month gets a "Log payment" control with amount, method and the statutory cash-receipt flag, writing a receipt tied to that month. The tenant sees the same row flip to Paid.
- **Arrears summary.** A banner at the top of the ledger totals overdue months and shows how many months are behind; it stays hidden when the account is clear.
- **Reminders.** A "Send reminder" button on any due or overdue month notifies the tenant. The tenant's workspace gets a matching arrears banner and a payment schedule of their own, read-only, with a "Mark as sent" action on the current month.

## 4. Listing edit, unpublish and delete

- New landlord route for editing a listing, reached from an **Edit** button on each property card on the dashboard.
- The form carries every field from the create flow: title, address, area, rent, deposit, NI landlord registration number, heating type, Fair Fuel toggle and tenant preferences.
- Photos can be added and individual existing photos removed.
- **Publish / Unpublish** toggle so drafts can be reopened and finished, and live listings can be pulled from the public feed without deleting them.
- **Delete listing** with a confirmation step, blocked when the listing already has applications or an executed tenancy attached — those must be handled first.

## 5. Deposit certificate and statutory notice for tenants

- **Certificate upload.** The Deposit Protection tab gains a file upload alongside the scheme and certificate number. The PDF goes into the private tenancy documents store, viewable by the landlord and that tenancy's tenant only.
- **Tenant visibility.** The tenant's deposit card shows the scheme, certificate number and a button to open the certificate.
- **Statutory notice for tenants.** The "Coming soon" button in the tenant Documents tab starts working — it generates the same Tenancy Information Notice the landlord side already produces, pre-filled from the tenancy record.
- **Lease download for tenants.** The tenant Documents tab currently calls the browser print dialogue on the whole page; it will produce the proper lease document instead, or open the landlord's uploaded PDF when a custom lease was used.
- **28-day reminder.** When the deadline is within seven days and the deposit is still unprotected, the landlord sees an amber warning and the tenant receives a "deposit deadline approaching" notification (sent at most once a day per tenancy).

## Technical notes

- **Database:** one migration adding `rent_due_reminder` and `rent_overdue` to the notification type list. No new tables.
- New shared module `src/lib/rent-schedule.ts` builds the month schedule and reconciles it against receipts, used by both workspaces so the two sides can never disagree.
- Files touched: `landlord.manage-tenancy.tsx`, `tenant.tenancy.tsx`, `dashboard.index.tsx`, a new listing edit route, `lib/rent-schedule.ts`, and `lib/notifications.functions.ts` for the new types.
