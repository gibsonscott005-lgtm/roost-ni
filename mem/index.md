# Project Memory

## Core
App name is **Roost** — Northern Ireland verified tenant passport & landlord listings platform. Wordmark renders as `Roost.ni` with the dot in `text-verified`.
British English (UK) throughout user-facing copy (colour, organise, £).
Design system: minimalist gray/white with emerald green accents. No purple/indigo gradients.
Analytics: PostHog only. Zero-cost / organic-growth philosophy — no paid APIs unless requested.
All tenant verification is self-certification — never say "Verified by Roost"; use "Self-Certified" and include the no-background-check disclaimer.
Every milestone mutation must fanout via `emitNotification` to the counterparty; do NOT add per-page realtime channels (the single one lives in NotificationsBell).

## Memories
- [Notifications ledger](mem://features/notifications-ledger) — polymorphic notifications table, event-driven fanout via emitNotification server fn, single realtime channel in NotificationsBell
- [Maintenance tickets](mem://features/maintenance-tickets) — maintenance_tickets table + panel components, storage RLS gated by ticket ownership, notification fanout on status changes
- [Self-certified passport](mem://features/self-certified-passport) — tenant_passports schema, wizard, verification_audit_logs, landlord ID viewing via signIdDocumentUrl, tenant-documents bucket rules
