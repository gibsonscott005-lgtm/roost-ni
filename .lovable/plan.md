## Maintenance Reporting UI — Tenant & Landlord

Wire the maintenance workflow into the existing tenancy workspaces, adapted to Roost's stack (TanStack Start, `emitNotification` server function, private `tenant-documents` bucket, British English).

### 1. Extend notification enum validator
`src/lib/notifications.functions.ts` — add `maintenance_reported`, `maintenance_updated`, `maintenance_resolved` to the Zod enum list so `emitNotification` accepts them.

### 2. Tenant Maintenance tab
Add a new **"Maintenance"** tab to `src/routes/_authenticated/tenant.tenancy.tsx`:
- Report form: Title, Urgency (Low/Medium/High/Emergency), Description, optional photos.
- Photos upload to `tenant-documents/maintenance/{userId}/{uuid}.{ext}` (private bucket → store paths, render via signed URLs; not `getPublicUrl` since bucket is private).
- Insert row into `maintenance_tickets`, then call `emitNotification` (our server fn, not the client RPC) with type `maintenance_reported`, entity `property_listing`, link `/landlord/manage-tenancy?id={propertyId}&tab=maintenance`.
- History list below form: status + urgency pills, landlord response block, thumbnails opening signed URLs.
- Invalidate `['maintenance-tickets', propertyId]` on success; toast via existing `sonner` pattern.

### 3. Landlord Maintenance tab
Add a **"Maintenance"** tab to `src/routes/_authenticated/landlord.manage-tenancy.tsx`:
- Left column: ticket list for that property.
- Right column: selected ticket editor — status dropdown (Reported / In Progress / Resolved / Cancelled), landlord notes textarea, photo thumbnails.
- On save: update `maintenance_tickets` (set `resolved_at` when status=resolved), then `emitNotification` with `maintenance_resolved` if resolved else `maintenance_updated`, link `/tenant/tenancy?tab=maintenance`.
- Invalidate `['landlord-maintenance-tickets', propertyId]`.

### 4. Deep-link tab state
Both tenancy pages already use tabbed layouts. Read `?tab=maintenance` from search params so notification link-paths open the correct tab.

### Adaptations from your snippet
- Use existing `emitNotification` TanStack server fn (keeps the "TypeScript-first, no DB triggers" architecture); the client RPC `supabase.rpc('emit_notification', ...)` would bypass our Zod layer.
- Private bucket → signed URLs (not `getPublicUrl`), matching how passport documents are rendered.
- British English copy ("colour", "organise", "Emergency (risk to safety)"), Roost minimalist gray/white + emerald palette, `sonner` toasts instead of `alert()`.
- No SQL migration needed — schema and RLS already in place from the previous milestone.

### Verification
- `tsgo --noEmit` after wiring.
- Manual: log a ticket as tenant → landlord bell fires → landlord updates status → tenant bell fires → resolved state renders correctly.
