# Real Identity Verification (tenant-paid)

Today the passport only *claims* verification: the tenant uploads a file, and the app writes
`id_status='self_certified'` plus `right_to_rent_verified: true` with nothing behind either.
This replaces the identity step with a genuine, automated check, and deletes the flag that
asserts something Roost never checked.

## What changes for a tenant

The Identity step gains a paid **Verify my identity** action. The tenant pays a one-off
verification fee, is taken to a hosted check where they photograph their document and their
face, and comes back to Roost. The check is automatic and usually settles in under a minute.
The document is matched for authenticity and the selfie is matched to the photo on it.

Uploading a document by hand stays available as a fallback and remains clearly labelled
self-certified. Verified and self-certified are shown as visibly different things.

## What changes for a landlord

A new badge tier in the inbox and candidate view:

```text
Verified ID          Document authenticity + face match confirmed by our
                     verification partner. Name and date of birth are as
                     printed on the document.
Self-Certified ID    A document was uploaded. Nobody has checked it.
```

The "What Roost checked / What you must check yourself" split updates: with a verified
tenant, identity moves to the checked column. Everything else — employment, previous
landlord, credit — stays the landlord's job, and the acceptance confirmation still applies.
Roost still never recommends or scores anyone.

## Right to Rent — removed

The Right to Rent scheme is England-only and has never applied in Northern Ireland. The
`right_to_rent_verified` column, its badge, and its contribution to the declared-items count
are all removed. The passport goes from four items to three: Identity, Income, References.

## Income

Meaningfully verifying income means reading the actual bank account through Open Banking,
which is a separate paid provider and a separate decision. Not in this milestone. What is
included now, at no cost: automated tamper signals on uploaded payslips and statements —
reading document metadata to flag when a file was produced by an image or PDF editor rather
than a payroll or banking system. Shown to the landlord as a signal, never as a verdict.

## Cost and pricing

The check costs roughly £1.20 each. The tenant pays a one-off fee at the point of
verification — proposed at £5, set in one place so it is easy to change. It buys a verified
passport reusable across every Roost application, which is the argument against paying a
referencing fee per property.

## Technical detail

**Provider.** Stripe Identity, with Stripe Checkout collecting the fee. One vendor, one
integration, one dashboard. Requires a `STRIPE_SECRET_KEY` secret.

**Schema.** `id_provider` and `id_session_id` already exist on `tenant_passports` and the
`verification_status` enum already carries `pending`/`verified`/`failed`, so the identity
work needs no new columns. Migration adds: verified name, date of birth and document expiry
returned by the provider; a `verification_fee_paid_at` timestamp; and drops
`right_to_rent_verified`.

**Flow.**

```text
Tenant clicks Verify
  -> createVerificationCheckout server fn: Stripe Checkout session, £5
  -> tenant pays, returns to /dashboard/passport/edit#identity
  -> webhook checkout.session.completed
       -> record fee paid, create Stripe Identity VerificationSession
  -> tenant redirected to the hosted document + selfie check
  -> webhook identity.verification_session.verified
       -> id_status='verified', id_provider='stripe', store verified fields
       -> verification_audit_logs row, notification to the tenant
  -> webhook identity.verification_session.requires_input
       -> id_status='failed', tenant is told why and can retry without paying twice
```

**Files.** New `src/lib/identity-verification.functions.ts` (checkout + session creation,
both behind `requireSupabaseAuth`) and `src/routes/api/public/stripe-webhook.ts` (signature
verified before anything is trusted; status is only ever written from the webhook, never from
the browser). Rewrites the identity step in `dashboard.passport.edit.tsx`; updates badges and
the checks split in `dashboard.applications.tsx`; updates the passport summary cards in
`dashboard.passport.index.tsx` and `dashboard.index.tsx`; adds a metadata inspection helper
for income documents.

**Records.** Every provider event is written to `verification_audit_logs`, which is
append-only and cannot be edited or deleted. Raw document images are held by the provider,
not copied into Roost storage.

## Needed from you

The Stripe secret key, once you approve. Live keys mean real charges, so test keys are
sensible until you are ready to trial it.