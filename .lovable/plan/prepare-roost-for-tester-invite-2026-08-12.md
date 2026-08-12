# Prepare Roost for tester invite

## Current readiness

The core tenant/landlord flow is implemented and functional: sign-up, passport wizard, listings, applications, lease issue/sign/counter-sign, tenancy management, rent ledger, deposit tracking, inventory, maintenance, notifications, real identity verification, and pricing architecture (simulated mode).

However, five gaps remain that will affect tester feedback and credibility. The app is **not yet published** and the most recent security scan is stale (11 Aug 2026, no findings, but `up_to_date: false`).

## Gaps to close before testers

1. **Safety certificate vault** — the biggest compliance gap. EPC, Gas Safety, EICR, and smoke/CO alarm certificates need upload, expiry tracking, and tenant visibility.
2. **Browse filters** — listings now carry property type, bedrooms, bathrooms, furnished, availability, bills, parking, but the feed does not filter/sort on them.
3. **Account settings** — users cannot change name, phone, email, or password, and there is no delete-account path.
4. **End-of-tenancy workflow** — notice to quit, final inspection, deposit settlement, returning the property to Available, and tenant view of past tenancies.
5. **Smaller gaps** — signed custom-PDF lease download, scheduled deadline notifications, tenant application withdrawal, listing photo reordering/cover-image picker.

## Publishing vs. preview

You do **not** have to publish to invite testers. Two options:

- **Public preview link** (Share → Share preview): temporary, view-only, 7 days, no Lovable account required. Good for a closed alpha with a small group you trust.
- **Publish**: permanent public URL, better for an open beta. Requires no critical unresolved security findings.

## Recommended pre-tester checklist

1. Run a fresh security scan and resolve any critical findings.
2. Complete the top three gaps (safety certificates, browse filters, account settings) so testers can experience the full listing/tenancy cycle.
3. Decide whether testers need a permanent public URL (publish) or a 7-day preview link.
4. Prepare tester onboarding: a short explanation of what is simulated (payments, identity verification) and what is real (documents, signatures, messages).

## Suggested first step

Approve a plan to build the safety certificate vault and refresh browse filters, then run a fresh security scan before sharing with testers.