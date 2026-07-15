## Notifications Milestone — Ready to Build

Approved decisions:
- Skip deposit-deadline cron; event-driven only this milestone.
- Build `notification_preferences` table but no settings UI yet.
- Fanout stays in TypeScript at mutation sites; no DB triggers on domain tables.

### 1. Migration (single call)

Enum + two tables + RLS + grants + realtime publication + `emit_notification(...)` SECURITY DEFINER fn, exactly as specified:

- `notification_type` enum with all 13 values.
- `public.notifications` (recipient_id, actor_id, type, title, body, entity_type, entity_id, link_path, read_at, created_at).
- `public.notification_preferences` (user_id PK, in_app_enabled, muted_types[]).
- RLS: recipients SELECT + UPDATE their own notifications; users manage own preferences. No client INSERT on notifications.
- Grants: `SELECT, UPDATE` on notifications to authenticated; full CRUD on preferences to authenticated; `ALL` to service_role on both.
- `ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;`
- `emit_notification(p_recipient_id, p_actor_id, p_type, p_entity_type, p_entity_id, p_title, p_body, p_link_path)` — reads prefs (default on if row missing), skips if muted, inserts row, returns id.

Small correctness tweak vs the pasted script: add `SET search_path = public` to the SECURITY DEFINER fn (Supabase linter flags it otherwise) — behaviour unchanged.

### 2. Server-side fanout wiring

Add `supabase.rpc('emit_notification', {...})` calls inside the existing mutation handlers. Fire-and-forget after the domain write succeeds; failures logged but never block the primary mutation.

Event map (recipient → type → link):

| Mutation site | Recipient | Type | link_path |
|---|---|---|---|
| Tenant applies (`ApplyCard`) | landlord | `application_received` | `/dashboard/applications` |
| Landlord accepts | tenant | `application_accepted` | `/dashboard` |
| Landlord declines | tenant | `application_declined` | `/dashboard` |
| Landlord issues lease | tenant | `lease_issued` | `/tenant/review-lease?share=…` |
| Tenant signs lease | landlord | `lease_signed_by_tenant` | `/dashboard/applications` |
| Landlord counter-signs | tenant | `lease_counter_signed` + `property_let_agreed` | `/tenant/tenancy` |
| Tenant marks payment sent | landlord | `receipt_logged` | `/landlord/manage-tenancy?share=…` |
| Landlord confirms receipt | tenant | `receipt_confirmed` | `/tenant/tenancy` |
| Landlord saves deposit scheme cert | tenant | `deposit_protected` | `/tenant/tenancy` |
| Tenant submits inventory sign-off | landlord | `inventory_submitted` | `/landlord/manage-tenancy?share=…` |
| Landlord approves inventory | tenant | `inventory_approved` | `/tenant/tenancy` |

British-English copy in titles/bodies (no emoji spam — one tasteful glyph max, per Roost tone).

### 3. Frontend — `NotificationsBell` refactor

Rewrite `src/components/notifications-bell.tsx` (currently derives from `passport_shares`) to:
- `useQuery(['notifications', userId])` → latest 20 from the new table.
- Single `useEffect` Realtime channel `notif:{userId}` filtered by `recipient_id=eq.{userId}`; on INSERT invalidate the query and toast via existing `sonner` (not `window.Notification` — matches project style).
- Unread badge from `notifications.filter(n => !n.read_at).length`.
- Click → mark-read mutation (`update read_at`) → `navigate({ to: n.link_path })`.
- Keep the current dropdown chrome/styling — only swap the data source.
- Import path: `@/integrations/supabase/client` (not `~/utils/supabaseClient`).

Header usage in `src/routes/index.tsx` and `src/components/dashboard-shell.tsx` unchanged — same component, same prop.

### 4. Out of scope this milestone

- No settings/preferences UI.
- No cron / deposit-deadline reminder.
- No email/SMS channels.
- No backfill of historical events.

### Verification

- Preview: apply as tenant → landlord bell pings in realtime; landlord accepts → tenant bell pings; complete lease + funds + inventory loop and confirm each event lands with the right deep-link.
- `supabase--linter` clean after migration.

Ready to switch to build mode and ship.
