# Sharpening what Roost is

Settle the positioning, then make the product say it out loud. The immediate driver is your liability concern: if a landlord can come away believing Roost vetted the tenant, that is a product defect, not a small-print problem.

## The positioning, in one paragraph

Roost is the letting agent replacement for the small self-managing landlord in Northern Ireland. It handles the whole tenancy — advertise, apply, lease, deposit, inventory, rent, repairs, records — with NI law built in. It organises and evidences information so a landlord can decide faster and prove they did things properly. **It never makes the letting decision, never vets a tenant on the landlord's behalf, and never replaces the landlord's own checks.**

Three supporting positions, from your answers:

- **Both sides pay.** A landlord fee for the tenancy workspace; a tenant fee for the reusable passport. Being paid by both is the honest version of being neutral — the tenant is Roost's customer too, not Roost's product.
- **Agent replacement, not portal.** The comparison is a high-street agent's fee, not a listings site. That sets the pricing ceiling and decides which features matter: the ones an agent currently does.
- **One-or-two-property landlord first.** Portfolios and agents fit later; nothing built now should block that, but nothing gets designed for them yet.

## Language rule — "Verified" is retired

The word "Verified" is the liability risk in a single word. It currently appears in the landlord inbox ("Verified tenants who applied to your live listings" and a "Verified tenant" name fallback), which is exactly the false impression to avoid.

- Replace every landlord-facing use of "Verified" with **"Self-Certified"**, "Declared", or "Evidence attached".
- Never a name fallback of "Verified tenant" — use "Applicant" when a name is missing.
- Roost states what it checked (a document is attached, figures add up, the declaration is timestamped) and what it did not (identity, employer, previous landlord, right to rent, credit).
- No score, rank, star, match percentage or shortlist. No "recommended". Ever.

## Make the boundary impossible to miss

Not one disclaimer buried in terms — the message appears where the decision is actually made:

- **Applicant card and candidate view:** a persistent "What Roost checked / What you must check yourself" split, sitting beside the claims rather than under them.
- **Accept applicant step:** a short confirmation before acceptance — the landlord ticks that they have carried out their own checks and understand Roost has not vetted this tenant. Recorded with a timestamp against the application, so there is a record that the landlord decided.
- **Affordability badge:** reframed as a visible calculation with its workings, explicitly labelled an aid, never a verdict.
- **Onboarding and dashboard:** a short "How Roost works, and what it does not do" panel in the landlord's own words.

## Where Roost goes — the agent-replacement roadmap

What a high-street agent does, and where Roost stands. This becomes the public roadmap and the order of work.

| Agent task | Roost today |
| --- | --- |
| Advertise the property | Built (listings, photos) |
| Handle enquiries and applications | Built (passport shares, inbox) |
| Reference the tenant | **Deliberately not done** — tenant declares, landlord verifies |
| Draw up the tenancy agreement | Built (NI template plus custom PDF) |
| Serve the statutory notice | Built (Tenancy Information Notice) |
| Protect the deposit | Recorded only — not lodged with a scheme |
| Inventory and check-in | Built |
| Collect rent, chase arrears | Built (schedule, reminders, receipts) |
| Hold safety certificates | **Missing** |
| Handle repairs | Built (maintenance tickets) |
| Rent increases and notice to quit | **Missing** |
| Check-out, deposit return, disputes | **Missing** |
| Year-end figures for tax | **Missing** |

The four gaps are what stands between Roost and the claim it is making. Rough order: certificates vault, then check-out and deposit return, then notice to quit and rent increases, then the tax summary.

## What gets written down

- `docs/positioning.md` — the paragraph above, the pricing stance, the target landlord, the language rule, and the never-do list. The reference for every future copy decision.
- Project memory — the boundary becomes a hard constraint so no future work reintroduces scoring, ranking or "Verified".

## Suggested first build

The language and boundary pass. It is small, it is copy and one confirmation step, and it removes the exact risk you raised before any more surface area gets added on top of the wrong wording.

## Technical notes

- Copy and presentation changes across `dashboard.applications.tsx`, `dashboard.index.tsx`, `passport-bits.tsx`, `listings.$id.tsx`.
- One small migration for the acceptance acknowledgement: `landlord_checks_confirmed_at` on `passport_shares`, set when the landlord accepts.
- No scoring or ranking logic exists today, so this is about preventing it rather than removing it.