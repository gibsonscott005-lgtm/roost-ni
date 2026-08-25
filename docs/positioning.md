# Roost — what it is, and what it is not

Reference for every product, copy and pricing decision. If something in the app
contradicts this document, the app is wrong.

## Positioning

Roost is the **letting agent replacement for the small self-managing landlord in
Northern Ireland**. It handles the whole tenancy — advertise, apply, lease,
deposit, inventory, rent, repairs, records — with NI law built in. It organises
and evidences information so a landlord can decide faster and prove they did
things properly.

**Roost never makes the letting decision, never vets a tenant on the landlord's
behalf, and never replaces the landlord's own checks.**

## Who it is for

The one-or-two-property self-managing landlord currently running a tenancy on
text messages and a shoebox of receipts. Portfolio landlords and letting agents
may fit later; nothing is designed for them yet, and nothing built now should
block them.

## Who pays

Both sides. A landlord fee for the tenancy workspace, a tenant fee for the
reusable passport. Being paid by both is the honest version of neutrality — the
tenant is a customer, not the product. The price comparison is a high-street
agent's fee, not a listings portal's.

## Two-sided balance

Roost must never sound like a landlord-only tool or a tenant-only tool, even when
one audience is dominant. The platform is paid by and built for both sides:

- **Renters** get a reusable Tenant Passport, transparent screening, and a direct
  line to the landlord — no repeated forms, no opaque intermediaries.
- **Landlords** get a compliant tenancy workspace and organised evidence, while
  keeping the letting decision entirely in their own hands.

Because both sides pay, Roost can be neutral. The renter is a customer, not the
product. The landlord is a customer, not the only stakeholder. Any description of
Roost — on the landing page, in outreach, or in the product — should make both
sides' benefits visible.

## The liability boundary

The single largest risk to Roost is a landlord believing Roost vetted a tenant.
If the interface allows that belief to form, the product has failed, regardless
of what the terms say. Therefore:

- Roost states what it checked: a document is attached, the figures entered add
  up, the declaration is timestamped and immutable.
- Roost states what it did not check: employment, previous landlord, credit
  history — and identity too, unless the tenant has paid for a real identity
  check, which is the one claim Roost stands behind.
- The boundary appears **where the decision is made** — beside the applicant's
  claims and at the point of acceptance — not only in the terms.
- Accepting an applicant requires the landlord to confirm they carried out their
  own checks. The confirmation is timestamped on the application record
  (`passport_shares.landlord_checks_confirmed_at`).

## Language rules

- The word **"Verified"** is retired from user-facing copy. Use "Self-Certified",
  "Declared", or "Evidence attached".
- Never fall back to "Verified tenant" for a missing name. Use "Applicant".
- Calculations such as income cover are shown with their workings and labelled
  as calculations. Never a verdict: no "Covered", no "Recommended".
- No approvals, no endorsements, no legal advice.

## Never do

- Score, rank, star-rate, match-percentage or shortlist tenants.
- Recommend or discourage a specific tenant to a landlord.
- Claim or imply a background, credit, employment or right-to-rent check has
  been performed.
- Auto-accept or auto-reject an application.
- Present a generated lease or notice as legal advice, or as solicitor-reviewed.
- Sell, share or repurpose tenant data beyond the application it was shared for.
- Imply a deposit is protected because it was recorded in Roost — Roost records
  protection, it does not lodge deposits with a scheme.
- Invent social-proof numbers (applicant counts, match counts, demand stats).

## Roadmap — measured against what an agent does

| Agent task | Roost |
| --- | --- |
| Advertise the property | Built |
| Handle enquiries and applications | Built |
| Reference the tenant | Deliberately not done — tenant declares, landlord verifies |
| Draw up the tenancy agreement | Built (NI template plus custom PDF) |
| Serve the statutory notice | Built (Tenancy Information Notice) |
| Protect the deposit | Recorded only — not lodged |
| Inventory and check-in | Built |
| Collect rent, chase arrears | Built |
| Hold safety certificates | Missing |
| Handle repairs | Built |
| Rent increases and notice to quit | Missing |
| Check-out, deposit return, disputes | Missing |
| Year-end figures for tax | Missing |

Order of work on the gaps: certificates vault, then check-out and deposit
return, then notice to quit and rent increases, then the tax summary.