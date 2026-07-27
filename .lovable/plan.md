## Current test accounts

Two accounts exist from previous testing:

| Account | Role | User ID |
|---|---|---|
| Scott Gibson (`gibsonscott005@gmail.com`) | tenant | `a287f3a2-d0b4-42e5-9b71-7cc330547f40` |
| Patricia Gibson (`usgibsons2004@gmail.com`) | landlord | `90ab437a-68fa-48f5-b3e9-1d304a5c38f7` |

Associated data currently in the database:
- 2 property listings, 2 passport shares, 2 tenant passports
- 1 maintenance ticket, 12 inventory items, 7 notifications
- 0 tenancy receipts, 0 verification audit logs

## Clean-slate deletion plan

Wipe both users and all their associated data so you can re-run the full flow from scratch.

1. **Delete storage objects** in the `tenant-documents` bucket under both users' folders (identity, income, references, maintenance photos).
2. **Delete public-schema rows** in FK-safe order:
   - `maintenance_tickets`, `tenancy_receipts`, `tenancy_inventory_items`
   - `notifications`, `notification_preferences`, `verification_audit_logs`
   - `passport_shares`, `tenant_passports`, `property_listings`
   - `profiles`
3. **Delete auth users** for both IDs via the admin API (this also cascades any remaining `auth.*` rows).
4. **Verify** counts return zero across all tables and `auth.users` no longer contains either email.

After this you'll have a clean canvas: sign up fresh tenant + landlord accounts at `/auth` and run the end-to-end flow (listing → apply → accept → issue lease → sign → counter-sign → tenancy workspace → maintenance).

### Options

- **A. Delete both accounts** (fresh tenant + landlord signups).
- **B. Delete only the tenant** (`gibsonscott005@gmail.com`) — keep the landlord + their listings so you can test applying from a brand new tenant against existing inventory.
- **C. Delete only the landlord** (`usgibsons2004@gmail.com`).
- **D. Keep both, just wipe transactional data** (listings, shares, tickets, receipts, inventory, notifications) so the accounts remain but the workspace is empty.

Which option do you want? Default recommendation: **A** for a truly clean trial.