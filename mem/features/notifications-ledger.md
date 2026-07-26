---
name: Notifications ledger
description: Polymorphic notifications table with event-driven fanout via emitNotification server fn; single realtime channel in NotificationsBell
type: feature
---
Unified `public.notifications` table is a polymorphic ledger serving both tenants and landlords. Fanout is event-driven from TypeScript mutations — not database triggers.

- Client entry: `emitNotification` server fn in `src/lib/notifications.functions.ts` (requires auth). Invokes the `emit_notification` Postgres SECURITY DEFINER function.
- `emit_notification` respects `notification_preferences` (`in_app_enabled`, `muted_types`); self-sends are suppressed at the server-function layer (`recipient_id === context.userId` short-circuits).
- Fixed enums — keep TS + DB in lockstep when adding events:
  - `type`: application_received, application_accepted, application_declined, lease_issued, lease_signed_by_tenant, lease_counter_signed, property_let_agreed, receipt_logged, receipt_confirmed, deposit_protected, deposit_deadline_approaching, inventory_submitted, inventory_approved, maintenance_reported, maintenance_updated, maintenance_resolved
  - `entity_type`: passport_share, property_listing, tenancy_receipt, inventory_item, maintenance_ticket
- Realtime: single subscription lives in `NotificationsBell` (`src/components/notifications-bell.tsx`), scoped `recipient_id=eq.${userId}`, wrapped in `useEffect` with `supabase.removeChannel` cleanup. Do NOT add competing per-page channels.

**How to apply:** every new milestone mutation (accept, sign, log receipt, resolve ticket, etc.) must call `emitNotification` for the counterparty with a working `link_path`. New `type` values require updates in both `NOTIFICATION_TYPES` and any DB check before use.
