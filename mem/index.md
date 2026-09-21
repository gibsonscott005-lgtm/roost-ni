# Project Memory

## Core
App name is **RoostNI** — letting agent replacement for small self-managing landlords in Northern Ireland. Wordmark renders as `RoostNI` with `NI` in `text-verified`. Always write the brand as "RoostNI", never bare "RoostNI".
RoostNI assists, it never decides: never vet, score, rank or recommend a tenant. The letting decision is always the landlord's.
RoostNI is a two-sided workspace: renter benefit and landlord benefit are stated together, even in landlord-facing copy. Neither side is the product.
"Verified" is retired from user-facing copy — use "Self-Certified", "Declared" or "Evidence attached". Missing name → "Applicant".
Never invent social-proof numbers (applicant counts, demand stats, match counts).
British English (UK) throughout user-facing copy (colour, organise, £).
Design system: Warm Porcelain neutrals (warm off-white ground, white surfaces) + emerald. No purple/indigo gradients, no cool slate greys.
Emerald is RESERVED for verified/success/active states only — never the primary button colour. Primary actions stay near-black.
Use shadow-resting / shadow-raised / shadow-floating / shadow-verified tokens; never hand-written shadow-[...] rgba values.
Analytics: PostHog only. Zero-cost / organic-growth philosophy — no paid APIs unless requested.
Identity is the one thing RoostNI verifies for real (tenant-paid check). Everything else is self-certified — only identity may say "Verified".
Right to Rent is England-only and must never appear in RoostNI. The column and all copy were removed deliberately.
All tenant verification is self-certification — never say "Verified by RoostNI"; use "Self-Certified" and include the no-background-check disclaimer.
Every milestone mutation must fanout via `emitNotification` to the counterparty; do NOT add per-page realtime channels (the single one lives in NotificationsBell).

## Memories
- [Notifications ledger](mem://features/notifications-ledger) — polymorphic notifications table, event-driven fanout via emitNotification server fn, single realtime channel in NotificationsBell
- [Maintenance tickets](mem://features/maintenance-tickets) — maintenance_tickets table + panel components, storage RLS gated by ticket ownership, notification fanout on status changes
- [Self-certified passport](mem://features/self-certified-passport) — tenant_passports schema, wizard, verification_audit_logs, landlord ID viewing via signIdDocumentUrl, tenant-documents bucket rules
- [Positioning & vetting boundary](mem://positioning-boundary) — agent-replacement positioning, both-sides pricing, the never-do list, language rules, landlord acceptance confirmation, agent-task roadmap
- [Palette & elevation](mem://design/palette-and-elevation) — Warm Porcelain tokens, emerald-reserved rule, elevation scale, form field styling
