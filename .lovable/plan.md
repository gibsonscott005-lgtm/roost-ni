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

## Cost and pricing — nothing is spent while testing

The build starts in **simulated mode**, with no payment provider connected and no account
needed. The tenant sees the real screens — fee notice, hosted-check hand-off, pass or fail
result — but the check is faked locally and settles instantly. Every screen, badge, webhook
path, audit row and failure branch is exercised for free.

Simulated mode is unmistakable in the interface: an amber **Simulated verification — no
payment taken, no real check performed** banner on the tenant screen, and a matching label
on the landlord's badge, so a simulated pass can never be mistaken for a real one. A
simulated pass is written with `id_provider='simulated'`, so if the mode is ever flipped the
test rows stay distinguishable in the database.

Going live is a switch, not a rewrite: connect the provider, set the mode to live. In
between there is a middle setting that runs the provider in its own test mode — real code
path, real hosted screens, test cards, still nothing charged.

For reference when you do go live: the check costs roughly £1.20, and the proposed tenant fee
is £5, set in one place. It buys a verified passport reusable across every Roost application,
which is the argument against paying a referencing fee per property.

## Technical detail

**Provider.** The verification layer is written against a small internal interface — start a
check, read a result — with two implementations behind it: `simulated` (default, no
credentials, no network) and `stripe` (Stripe Identity for the check, Stripe Checkout for the
fee). A single `VERIFICATION_MODE` setting selects between them, so no Stripe account or
`STRIPE_SECRET_KEY` is needed to build, test or demo this. Nothing is installed or connected
in this milestone.

**Schema.** `id_provider` and `id_session_id` already exist on `tenant_passports` and the
`verification_status` enum already carries `pending`/`verified`/`failed`, so the identity
work needs no new columns. Migration adds: verified name, date of birth and document expiry
returned by the provider; a `verification_fee_paid_at` timestamp; and drops
`right_to_rent_verified`.

**Flow.**

```text
Tenant clicks Verify
  -> startVerification server fn  ->  id_status='pending'

  SIMULATED                          LIVE
  in-app mock screen                 Stripe Checkout £5, then the hosted
  pass / fail buttons                document + selfie check
  resolves instantly                 provider webhook returns the result

  -> both converge on the same result handler
       verified  -> id_status='verified', store verified name / DOB /
                    document expiry, audit row, notify the tenant
       failed    -> id_status='failed', reason shown, retry without
                    paying twice
```

**Files.** New `src/lib/identity-verification.functions.ts` (start and resolve, both behind
`requireSupabaseAuth`) and `src/lib/identity-providers.server.ts` holding the simulated and
Stripe implementations. The webhook route is added but inert until live mode. Status is only
ever written server-side — the simulated pass/fail buttons call a server function that checks
the mode first and refuses to write a simulated result when live. Rewrites the identity step
in `dashboard.passport.edit.tsx`; updates badges and the checks split in
`dashboard.applications.tsx`; updates the passport summary cards in
`dashboard.passport.index.tsx` and `dashboard.index.tsx`; adds a metadata inspection helper
for income documents.

**Records.** Every provider event is written to `verification_audit_logs`, which is
append-only and cannot be edited or deleted. Raw document images are held by the provider,
not copied into Roost storage.

## Needed from you

Nothing. No account, no keys, no spend. When you are ready to trial the real check, connecting
a provider and flipping the mode is a small follow-up.