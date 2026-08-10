# LANI readiness pass

Goal: close the gaps a landlord trade body would find first, then approach LANI with a written briefing rather than a pitch.

## 1. Property compliance certificates (biggest gap)

Certificates are named in the lease and statutory notice text, but nowhere in the app can a landlord actually hold one. Members get fined for this.

- New **Compliance** tab in the landlord tenancy workspace, plus a certificates section on each property.
- Three record types: EICR, Gas Safety (where applicable), EPC. Each takes a PDF upload, issue date, expiry date, and an optional rating for the EPC.
- Status pill per certificate: Valid, Expiring soon (within 60 days), Expired, Missing.
- Dashboard warning on any property with an expired or missing certificate.
- The tenant tenancy workspace gets a read-only Certificates card so they can open the documents the landlord is required to supply.
- The Tenancy Information Notice pulls real certificate dates instead of the current generic sentence.

## 2. Deposit protection — make the limits explicit

Roost records a scheme and certificate number; it does not lodge the deposit with TDS NI, MyDeposits NI or LPS NI.

- Clear notice on the Deposit Protection tab: Roost records your protection, it does not lodge the deposit. Direct links to the three approved NI schemes.
- The 28-day countdown gains an explicit "you must lodge with the scheme separately" line so nobody reads a ticked box as compliance.

## 3. Legal and data-protection layer

- New public pages: Terms of Use, Privacy Policy, and a short Legal Disclaimer.
- Privacy Policy covers what tenant ID and income evidence is held, where, who can see it, how long it is kept, and how to request deletion — a landlord using Roost is a data controller and needs this to exist.
- Footer links from the home, listings and auth pages.
- Every generated document (lease, statutory notice) carries a footer stating it is a template generated from the tenancy record, not legal advice, and has not been reviewed by a solicitor.
- Passport sharing gains a plain-language consent line for the tenant on submission.

## 4. Self-certification honesty pass

The single question LANI will ask is what stops a tenant typing anything.

- Consistent wording across tenant and landlord views: Self-Certified — declared by the tenant, evidence attached, not independently checked by Roost.
- Landlord candidate view gains a short "what to verify yourself" checklist alongside each claim.
- Timestamped declaration recorded on submission (the audit log already exists) and surfaced to the landlord as "declared true on <date>".

## 5. LANI briefing document

A markdown pack in the repo at `docs/lani-briefing.md`, printable from the app:

- What Roost is and who it is for.
- NI regulatory mapping: PTA 2022 items covered, how each is handled.
- Explicit limitations list: no credit or employment checks, no Right to Rent verification, no deposit lodgement, documents not solicitor-reviewed, no notice-to-quit or rent-increase tooling yet.
- The specific questions to put to LANI: does the Tenancy Information Notice wording satisfy them, what would make the tenant passport credible to members, and which post-move-in task causes members the most pain.

## Deliberately out of scope for now

Notice to quit and rent-increase tooling. Both depend on statutory notice-period tables that should be confirmed with LANI first rather than guessed at.

## Technical notes

- One migration: `property_certificates` table (listing_id, kind enum eicr/gas/epc, document_path, issued_on, expires_on, epc_rating, created_by) with GRANTs, RLS scoped to the owning landlord plus the tenant of an executed tenancy on that listing, and a `certificate_expiring` notification type.
- Certificate PDFs go into the existing private `tenant-documents` bucket under a `certificates/<listing_id>/` prefix, with a storage policy matching the table RLS; viewing uses the same short-lived signed-URL pattern as the deposit certificate.
- Files touched: new `src/routes/legal.terms.tsx`, `legal.privacy.tsx`, new `src/components/certificates-panel.tsx`, plus `landlord.manage-tenancy.tsx`, `tenant.tenancy.tsx`, `dashboard.index.tsx`, `dashboard.listing-edit.tsx`, `lib/tenancy-docs.ts`, `lib/notifications.functions.ts`, and `docs/lani-briefing.md`.