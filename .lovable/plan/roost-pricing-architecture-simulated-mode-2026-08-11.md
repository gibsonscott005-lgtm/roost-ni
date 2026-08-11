# Roost Pricing Architecture (simulated mode)

Puts the whole commercial model into the product — tiers, completion fees, one-off documents and the biometric pass — with charging switched off behind a flag. Nothing is billed, nothing is blocked, no payment provider is connected.

## What gets defined

**Subscription tiers** (landlord, by active property count)

| Tier | Properties | Monthly | Completion fee |
| --- | --- | --- | --- |
| Starter | 1 | £0.00 | £39.00 |
| Pro Portfolio | up to 5 | £9.99 | £19.00 |
| Growth Portfolio | up to 10 | £14.99 | £9.00 |
| Enterprise Portfolio | 10+ | £19.99 + £1.50 per unit over 10 | £15.00 |

**Standalone documents** (one-off)

- NI Statutory Tenancy Agreement & TIN — £14.99
- Statutory Notice to Quit Generator — £12.99
- Statutory Rent Increase Notice — £9.99
- Check-Out Inspection & Fair Fuel Baseline Log — £9.99

**Biometric identity pass** — £5.00, optional. The free self-certified route stays exactly as it is and is never gated. This reuses the existing £5 verification fee already defined in the identity flow, so the two read from one source rather than drifting apart.

## Payments stay off

A single flag, defaulting to off, controls everything. While off:

- Prices, tier calculations and invoice summaries are shown as previews, clearly labelled "Simulated — no payment taken".
- No card is charged, no feature is locked, no document is withheld.
- Every price surface reads from the same configuration, so turning payments on later is a settings change rather than a rebuild.

## What the landlord sees

**Settings — Subscription & Billing (read-only preview)**

- Current tier, derived live from their active property count, with the count and the threshold that put them there.
- Monthly figure, including the per-unit calculation spelled out for Enterprise.
- Completion fee that would apply to a tenancy on their tier.
- The full tier table with their row highlighted, so the upgrade path is visible.
- A simulated invoice summary for the current month.
- An amber banner stating billing is not active.

**Property and tenancy setup**

- A pricing breakdown panel on the listing creation flow and in the tenancy management workspace showing the completion fee for the current tier, and the standalone document prices where those documents are generated (tenancy agreement/TIN, notice to quit, rent increase notice, check-out log).
- Each shows as a preview price with a "no charge while billing is off" note; the document still generates.

## Technical section

**Database.** One migration adding two public tables:

- `pricing_tiers` — key, name, min/max properties, monthly pence, per-extra-unit pence, completion fee pence, sort order. Seeded with the four tiers as literal inserts.
- `billing_config` — single-row config: payments enabled flag, currency, plus the standalone document catalogue and biometric fee as priced rows in a third small table `pricing_items` (key, name, category, price pence, active).

All three are read-only reference data: `GRANT SELECT` to `authenticated` and `anon`, `GRANT ALL` to `service_role`, RLS on with a read-only policy for everyone and no write policy — changes only ever come through migrations.

**Config.** `VITE_ENABLE_PAYMENT_GATEWAY=false` in the environment, read client-side; the server-authoritative equivalent lives in `billing_config.payments_enabled` so the client flag can never turn charging on by itself. Effective state is `flag AND db AND provider key present` — false unless all three agree.

**Code.**
- New `src/lib/pricing.ts` — client-safe types, the tier table as a typed fallback, `tierForPropertyCount()`, `monthlyPence()` (including the Enterprise per-unit maths), `completionFeePence()` and `formatGBP()`. Pure functions, unit-testable.
- New `src/lib/pricing.functions.ts` — a server function returning the resolved billing config, tiers, items and the caller's property count.
- New `src/components/pricing-breakdown.tsx` — the reusable preview panel used in listing setup and the tenancy workspace.
- New billing section in `src/routes/_authenticated/dashboard.settings.tsx`.
- `src/lib/identity-verification.ts` keeps `VERIFICATION_FEE_PENCE` but sources it from the biometric pricing item so there is one number.

No Stripe work, no provider account, no keys in this milestone.
