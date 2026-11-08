# Tenanted property route, 10-day target, founders, tenant invite

Each part is priced separately. A + B + C together: about 4.5–6.5 credits. D on top: 2–3.

## What already exists
- Landlords can already save a home as "tenanted" and set up Manage Tenancy (tenant name and email, start date, deposit scheme and reference).
- Founding places already count tenanted and vacant homes by address, so duplicates count once.
- Most offer wording already says "add a home". One leftover label on the "List a property" page.
- Deposit received date and prescribed information date fields already exist. For existing tenancies the deposit countdowns are switched off on purpose.

## A. Tenanted property route — 2–3 credits
- A clear "I already have a tenant" path when adding a home, which goes straight into a checklist on the property, with no public listing.
- Checklist fields: tenancy start date, rent amount, rent frequency (weekly / fortnightly / monthly), deposit amount, date received, scheme, date protected, tenant names, emails and phone numbers (more than one tenant allowed), date the tenancy information notice was given, and landlord registration number.
- Every field is optional to save. All tools stay open whatever is filled in.
- Database additions: rent frequency, tenant phone, extra tenants, and a tenancy information notice "date given" (the existing tick box stays as "Landlord says a notice is on file").
- Cost rises if: rent frequency must also change the rent ledger and arrears maths (currently monthly only). I'd store it for display only in this build. Making the ledger handle weekly rent is roughly +1.5 credits.

## B. 10-day soft completion target — 1.5–2 credits
- Progress bar on the property ("7 of 11 done") and on the dashboard card, with a 10-day target counted from the day the home is added.
- Reminder emails on day 3, day 7 and day 10, then weekly until complete. One per day at most, and none once everything is filled in. Wording: "RoostNI helps you keep your records in order", never "overdue" or "penalty".
- Uses the existing reminder job and email system.
- Cost rises if: you want a new email design, or an opt-out setting just for these emails (the existing notification settings would cover it).

## C. Founders — 0.5–1 credit
- Change the remaining "list" wording where it refers to the offer (for example the "List a property" label) to "add a property". Robin's offer line and the homepage already match.
- Check that the live places count includes homes added through the new tenanted route, and leaves out test homes and your admin account.

## D. Tenant invite (optional) — 2–3 credits
- "Invite tenant" button sends one email per tenant with a single-use link. The tenant signs up or signs in and is attached to the existing tenancy, with read access to receipts, maintenance and notices.
- Cost rises if: invites need to expire, be resent, or handle a tenant whose email already belongs to a landlord account.

## Clashes to flag
1. **Deposit clock:** the existing 28- and 35-day countdowns are switched off for existing tenancies so the app never says a landlord is late about a deposit taken before RoostNI. The new fields will be stored as records and counted in the progress bar only. They will not start countdowns. Deposits received before 1 April 2023 are never treated as late.
2. **Tenancy information notice:** the "date given" is recorded as a statement by the landlord. It does not mark the tenancy compliant and does not trigger a lateness warning.
3. **Sign-up:** names are now optional at sign-up. Reminder emails will open with "Hi there" when no name is saved. The tenant invite (D) needs the email-code step to work for invited tenants. I'll check that if you approve D.
4. **Founder tracking:** founding status has no billing behind it yet, because billing is off. The "one month free from the day they add a home" date will be read from when the home was added. Deleting and re-adding a home at the same address keeps the original date.
5. **10-day target vs legal deadlines:** it is a RoostNI target, not a legal deadline. The emails will say so.

## Technical notes
- New nullable columns on passport_shares (rent_frequency, tin_given_at, completion_target_at) plus a small tenancy_occupants table (name, email, phone) with landlord-only access rules.
- Progress logic goes in a tested pure helper (src/lib/tenancy-completeness.ts). Reminders go in the existing reminders.server.ts with reminder_log stopping repeats.
- Estimates assume one pass, no browser walkthrough beyond a single signed-in check. A full browser test adds about 0.5 credit.
