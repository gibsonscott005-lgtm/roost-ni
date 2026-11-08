# Four separate parts — approve one at a time

## 1. Homepage button for already-tenanted homes — about 0.3–0.5 credits
- **What's there now:** the homepage already says "Add your home — vacant or already tenanted", and the existing-tenancy record and "Manage tenancy" flow are built. There's no dedicated button for it.
- **New:** a clear second button in the landlord section, "Move a tenanted home to RoostNI". It goes to the "I already have a tenant" add-a-home route (signed-out visitors sign in or sign up first, then land there). It fires one PostHog event for the click.
- **Clashes:** none. Founding places are still counted by address, sign-up is unchanged, and the records checklist and deposit countdown stay off for existing tenancies.

## 2. Robin rebuild: 14 loud "join RoostNI" posts a week — about 2.5–3.5 credits to build, plus about 0.8–1.2 each week to generate drafts
- **What's there now:** manual drafts, the append-only post and results history, first comments with tracked campaign links, results entry and reminders, weekly learning, the group schedule (Europe/London time) and the live founding count.
- **New:**
  - A fixed weekly plan of 2 posts a day: slot A alternates between your two groups and slot B is the RoostNI Page.
  - A new brief: short, blunt, brutalist calls to join, built on pain points instead of general habit advice. Every post ends with an invitation to RoostNI.
  - Text only. The image prompts are removed from the new drafts.
  - A "follows gained" field in results entry, so the weekly review compares follows and engagement by post type.
- **Unchanged:** the wording rules, the banned phrases, approved legal facts only, the founding-offer wording, drafts only and no auto-posting.
- **Clashes:** follows go in a new, add-only results field, so earlier records are never altered. The founding-place wording keeps reading the live count. Nothing touches sign-up.

## 3. Partial Tenant Passport view — about 1.5–2.5 credits
- **What's there now:** the landlord inbox already hides the reference file location and shows only whether a reference exists, plus statuses such as ID and employment.
- **New:**
  - Before a formal application, the landlord sees only a summary: the reference is listed by name/type with its verified status, income and rent figures are shown, and no document files appear.
  - The files (ID, proof of address, payslips, reference letter) unlock only when the share is a formal application. This is enforced on the server, not just hidden on screen.
  - Access is still revoked immediately on withdrawal.
- **Needs checking first:** how a "formal application" is currently marked on a share. If no clear status exists, I'll add one, which adds about 0.5 credits.
- **Clashes:** existing-tenancy records with no tenant attached are unaffected. Tenants still pay nothing.

## 4. Reminders, plus a deposit wording check — about 1–1.5 credits for the reminders, and the check is included
- **What's there now:** the reminder engine handles rent, deposit protection (28 and 35 days from receipt), certificates and the RoostNI records reminder (days 3, 7, 10, then weekly). There's no reminder for the tenancy information notice or for landlord registration.
- **New:**
  - **Tenancy information notice:** reminders for new RoostNI tenancies only, counted from the date the tenancy was granted, as the 28-day deadline approaches. They stop once the notice is marked given. Existing tenancies never get them, which matches the rule against stating a legal position for older tenancies.
  - **Landlord registration:** a one-off nudge, then monthly, until the landlord adds a registration number or ticks "registered". The wording comes from the approved legal fact (c214b49f, "must register with the Landlord Registration Scheme"). It doesn't mention fines.
- **Deposit return check (flag only, nothing changed):** the end-of-tenancy panel says "Deposits must be settled within 28 days of the end date", fixed in the code as 28 days. **No approved legal fact supports this.** The legal facts table has nothing on deposit return. The wording is unverified and states a "must". I recommend you add a sourced fact, or soften the wording, as a separate decision.
- **Clashes:** the records checklist reminder and the new notice reminder could overlap for the same tenancy. I'll keep them as separate reminder types so neither repeats the other. The deposit clock is untouched. Founder tracking and sign-up are untouched.

## Totals if all four are approved
About 5.3–7.9 credits to build, plus Robin's weekly drafting cost.

## Technical notes
- Part 1: a link to the existing add-a-home route with its existing-tenancy flag. The route will be confirmed at build time.
- Part 2: `robin-plan.ts` gets the new cadence, `marketing-knowledge.ts` the new brief, a new nullable follows column goes on the results table (allowed by the append-only triggers), and the weekly insights get a follows metric.
- Part 3: the passport inbox server function returns signed document links only when the share's status is a formal application. Other shares get a summary only.
- Part 4: two new reminder types in `reminders.server.ts`, each with a deduplicated kind key. Both are skipped when the record is an existing agreement.
