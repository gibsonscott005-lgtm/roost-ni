---
name: Roost positioning and the vetting boundary
description: Roost is an agent replacement for small NI self-managing landlords; it never vets, scores or recommends tenants — full detail in docs/positioning.md
type: constraint
---
Roost is the **letting agent replacement for the small self-managing landlord in Northern Ireland**. Both sides pay: landlord fee for the tenancy workspace, tenant fee for the reusable passport. Compare pricing to an agent's fee, not to a listings portal.

**Hard boundary — Roost assists, it never decides.** The largest risk to the business is a landlord believing Roost vetted a tenant and skipping their own checks. If the UI allows that belief to form, the product is wrong, whatever the terms say.

Never, under any circumstances:
- Score, rank, star-rate, match-percentage or shortlist tenants.
- Recommend, endorse or discourage a specific tenant.
- Claim or imply Roost performed a background, credit, employment or right-to-rent check.
- Auto-accept or auto-reject an application.
- Present generated leases or notices as legal advice or solicitor-reviewed.
- Imply a deposit is protected because it was recorded — Roost records, it does not lodge.
- Invent social-proof numbers (applicant counts, demand stats, match counts).

**Language:** the word "Verified" is retired from user-facing copy — use "Self-Certified", "Declared" or "Evidence attached". Missing name falls back to "Applicant", never "Verified tenant". Calculations (income cover) show their workings and are labelled calculations, never verdicts like "Covered" or "Guarantor Recommended".

**How to apply:** any screen showing tenant claims must carry the "What Roost checked / What you must check yourself" split beside the claims. Accepting an applicant requires a landlord confirmation checkbox, timestamped to `passport_shares.landlord_checks_confirmed_at`.

Full reference: `docs/positioning.md`, which also holds the agent-replacement roadmap (gaps: certificates vault, check-out and deposit return, notice to quit and rent increases, tax summary).