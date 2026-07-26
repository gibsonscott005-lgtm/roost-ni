# Update project memory with core systems documentation

Add three feature-memory files so future sessions apply these rules automatically, plus update `mem://index.md` to reference them.

## Files to create

### 1. `mem://features/notifications-ledger`
Type: `feature`
- Unified `notifications` table = polymorphic ledger for tenants + landlords.
- Fanout is event-driven from TS mutations, not DB triggers. Client calls the `emitNotification` server function (`src/lib/notifications.functions.ts`) which invokes the `emit_notification` Postgres SECURITY DEFINER function.
- `emit_notification` respects `notification_preferences` (`in_app_enabled`, `muted_types`) and self-sends are suppressed at the server-function layer.
- Fixed enums (keep these in sync when adding events):
  - `type`: `application_received | application_accepted | application_declined | lease_issued | lease_signed_by_tenant | lease_counter_signed | property_let_agreed | receipt_logged | receipt_confirmed | deposit_protected | deposit_deadline_approaching | inventory_submitted | inventory_approved | maintenance_reported | maintenance_updated | maintenance_resolved`
  - `entity_type`: `passport_share | property_listing | tenancy_receipt | inventory_item | maintenance_ticket`
- Realtime: single subscription lives in `NotificationsBell` (`src/components/notifications-bell.tsx`), scoped to `recipient_id=eq.${userId}`, cleaned up on unmount. Do not add competing per-page channels.
- **How to apply:** every new milestone mutation (accept, sign, log receipt, resolve ticket, etc.) must call `emitNotification` for the counterparty with a working `link_path`. Add new `type` values in both the TS enum and any DB check before use.

### 2. `mem://features/maintenance-tickets`
Type: `feature`
- Table `maintenance_tickets` drives the tenant/landlord Maintenance tab in the Tenancy Workspaces.
- Enums: `urgency` (low/medium/high/emergency) and `status` (open/acknowledged/in_progress/resolved). Photos live in the private `tenant-documents` bucket under `maintenance/<tenant_id>/…`.
- Storage RLS: tenant reads own uploads; landlord read is gated by `Landlords view maintenance photos on their listings` policy (path must be referenced in a `maintenance_tickets` row on a listing they own).
- UI split lives in `src/components/maintenance-panel.tsx` (`TenantMaintenanceTab` reports + uploads, `LandlordMaintenanceTab` acknowledges/resolves). Uses skeleton loaders + friendly empty states ("No active maintenance tickets — all clear!").
- Every status change must fanout the corresponding notification (`maintenance_reported | maintenance_updated | maintenance_resolved`) to the counterparty via `emitNotification`.
- **How to apply:** never bypass the panel components for maintenance UI; extend them. Never expose raw photo URLs — always mint 60s signed URLs (`SignedPhoto` component pattern with Refresh-link fallback).

### 3. `mem://features/self-certified-passport`
Type: `feature`
- Roost does **not** perform background checks. All passport verification is tenant-self-certification. User-facing copy must say "Self-Certified", never "Verified by Roost". Include the disclaimer wherever verification is surfaced.
- `tenant_passports` verification fields: `id_status` (enum incl. `self_certified`), `id_verified_at`, `issuing_country`, `id_document_path` (private storage), plus booleans `identity_verified`, `income_verified`, `reference_verified`, `right_to_rent_verified` (flipped true instantly on submission for this prototype).
- Wizard (`src/routes/_authenticated/dashboard.passport.edit.tsx`): 3 steps — Identity & Right to Rent (with issuing-country selector), Income, References (branch: First-Time Renter guarantor vs Experienced Renter 3-year rule with optional 2nd landlord ref).
- Every self-certification writes an immutable row to `verification_audit_logs` (append-only; RLS restricts reads).
- Landlord ID document viewing: NEVER let the landlord browser client sign the URL directly — tenant-only RLS on `identity/`. Use the `signIdDocumentUrl` server fn (`src/lib/identity-docs.functions.ts`) which verifies landlord owns the listing referenced by the `passport_share`, then admin-signs a 60s URL.
- Documents bucket `tenant-documents` is `public=false`; anon access fully blocked. iOS Safari PDF uploads must go via `arrayBuffer()` (streaming form uploads fail).
- **How to apply:** any new passport field must persist via `.upsert({ user_id }, { onConflict: 'user_id' })` and be gated behind the auth-loading spinner in the wizard/dashboard to avoid remount data-loss.

## Index update

Replace `mem://index.md` Memories section with:
- Notifications ledger — polymorphic table, event-driven fanout, single realtime channel in NotificationsBell
- Maintenance tickets — table + panel components, storage RLS, notification fanout on status changes
- Self-certified passport — wizard schema, audit logs, landlord ID viewing server fn, storage rules

Core rules stay unchanged (already correct: Roost.ni brand, UK English, minimalist emerald palette, PostHog, zero-cost philosophy).

## Out of scope

No code or schema changes — memory files only.
