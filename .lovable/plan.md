## Plan

Replace the static "Your verified passport is ready" card on the tenant dashboard with a live passport summary plus next-step actions, driven by the user's `tenant_passports` row.

### Behaviour

**If passport is incomplete** (any of identity / income / references not verified):
- Show a progress card: "X of 3 steps complete" with a progress bar and a checklist of the three steps (tick = done, circle = pending).
- Primary CTA: **Continue verification** → `/dashboard/passport/edit`.
- Secondary: **Browse properties**.

**If passport is fully verified** (identity + income + references all true):
- Header switches to **Your verified passport** with a green "Verified" badge.
- Show the four verified badges: Identity, Right to Rent, Income, References (matches the four checks the editor sets).
- Show a small details strip: name, employment status (formatted), monthly net income (£), document on file indicator.
- Action row:
  - **Browse properties** → `/listings` (primary)
  - **Edit passport** → `/dashboard/passport/edit`
  - **Share passport** → copies a shareable link `${origin}/passport/${user.id}` to the clipboard with a toast (link target not built yet — copy + toast only, no new route).

### Files

1. `src/routes/_authenticated/dashboard.index.tsx`
   - Rewrite the `TenantDashboard` component:
     - Load the tenant's `tenant_passports` row (select identity_verified, income_verified, reference_verified, right_to_rent_verified, employment_status, monthly_income_net, id_document_path, full_name via profile).
     - Loading skeleton while fetching.
     - Render incomplete vs complete variants as described.
   - Keep the existing card shell styling (rounded-3xl border, same paddings, verified-soft accents) so visual language stays consistent.

No schema changes, no new routes, no business-logic changes to the editor.