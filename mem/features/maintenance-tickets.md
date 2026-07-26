---
name: Maintenance tickets
description: maintenance_tickets table + panel components for Tenancy Workspace; storage RLS gated by ticket ownership; notification fanout on status changes
type: feature
---
`public.maintenance_tickets` drives the Maintenance tab in both tenant and landlord Tenancy Workspaces.

- Enums: `urgency` = low | medium | high | emergency; `status` = open | acknowledged | in_progress | resolved.
- Photos: private `tenant-documents` bucket under `maintenance/<tenant_id>/…`.
- Storage RLS: tenant reads own uploads via `storage.foldername(name)[1] = auth.uid()`. Landlord read is gated by policy `Landlords view maintenance photos on their listings` — the file path must be referenced in a `maintenance_tickets` row on a listing they own.
- UI: `src/components/maintenance-panel.tsx` exports `TenantMaintenanceTab` (report + upload) and `LandlordMaintenanceTab` (acknowledge/resolve). Both use skeleton loaders (`TicketSkeletonList`) and friendly empty states ("No active maintenance tickets — all clear!").
- Every status change fans out `maintenance_reported | maintenance_updated | maintenance_resolved` to the counterparty via `emitNotification`.

**How to apply:** never bypass the panel components for maintenance UI — extend them. Never expose raw storage URLs — always mint 60s signed URLs (`SignedPhoto` pattern with Refresh-link fallback).
