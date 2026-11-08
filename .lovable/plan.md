# Bring site wording in line with the Private Tenancies Act (NI) 2022

Wording only. No new legal facts rows. Estimate: **about 0.5–0.8 credits** for parts 1–3. Part 4 is the audit below and costs nothing more.

## 1. Deposit return: remove the 28-day figure

**Where the 28-day figure is used.** It is the setting `DEPOSIT_RETURN_DAYS = 28` in `src/lib/tenancy-end.ts`. It feeds a "deposit deadline" date that appears in **four places**, all in `src/components/tenancy-end-panel.tsx`:

| # | Where | Current text |
|---|---|---|
| a | Notice footer (line 724) | "Deposits must be settled within {28} days of the end date (by {date})." |
| b | Tracker banner (line 444) | "Deposit must be settled by {date} — N days left / N days overdue". It turns amber or red as the date gets closer or passes. |
| c | Landlord settlement card (line 1350) | "Must be settled by {date} · N days left / N days overdue" |
| d | Tenant view (lines 1506–1508) | "Your landlord has not proposed a deposit settlement yet. They have until {date}." |

It is **not** used in any reminder, email, Robin copy or legal fact. The deposit reminders that are running use the separate 28-day protection and 35-day information rules, which count from when the deposit was received. Those stay as they are.

**Changes:**
- a → "When a tenancy ends, the deposit is repaid through your deposit scheme. Apply to the scheme and say how much you want to keep and why. Your scheme's rules set the timings." The sentence before it ("A Notice to Quit must be in writing… RoostNI keeps the dated record.") stays.
- b → the banner, countdown and overdue colouring are removed completely.
- c → "Must be settled by…" and the countdown are removed. Nothing replaces them.
- d → "Your landlord has not proposed a deposit settlement yet. The deposit is repaid through your deposit scheme, and the scheme's rules set the timings."
- The 28-day setting and the date calculation stay in the code but nothing shows them any more. They'll be marked "not a legal deadline, not displayed" so they're never shown again by mistake.

## 2. Deposit cap: "must not be more than one month's rent"

**What I found.** No wording on the site says "should not" or presents the limit as guidance. Every mention already states it as a firm rule:

- `src/routes/landlord-registration-ni.tsx:127` "A deposit cannot be more than one month's rent."
- `src/routes/list-property.tsx:193` "…the deposit can't exceed one month's rent (£X)."
- `src/routes/list-property.tsx:194` "Deposits in Northern Ireland are capped at one month's rent."
- `src/routes/_authenticated/dashboard.listing-edit.tsx:429` "In Northern Ireland, deposits are legally capped at one month's rent."
- `src/routes/_authenticated/dashboard.index.tsx:1156` "Deposits are capped at one month's rent under the Private Tenancies Act (NI) 2022; we check this for you."
- `src/routes/_authenticated/dashboard.index.tsx:1595` "…a deposit cannot exceed one month's rent. Please lower it to £X or less."
- `src/routes/_authenticated/dashboard.applications.tsx:195` and `:1153` "…exceeds / cannot exceed one month's rent…"
- Blog article "what-every-northern-ireland-tenancy-agreement-must-include": "A tenancy deposit cannot be more than one month's rent…"
- Records panel check (`tenancy-records-panel.tsx:93`): left as it is, as you asked.

**Proposed: no edits**, because none of these say "should not". If you'd like them all to read exactly "must not be more than one month's rent", tell me and I'll change the six on-site lines above. That adds about 0.2 credits.

**One thing to flag:** Robin's rules currently block any "deposit cap" wording in posts (`marketing-knowledge.ts:87`) and tell it "Do not mention deposit caps" (`robin.functions.ts:94`). I'll leave that alone unless you want Robin to be able to mention the cap. If you do, the right way is through an approved legal fact.

## 3. Tenancy information notice reminders: count from the grant date

**What exists.**
- There's no counter-signed date.
- `lease_signed_at` (when the tenant signs, set in `tenant.review-lease.tsx:127`) is recorded.
- Counter-signing only changes the status and doesn't save when it happened.

**Change to the counting:** count from `lease_signed_at`, the date the agreement was signed. If it's missing, use the tenancy start date. Existing tenancies are still excluded. The tests are updated to match.

**Wording problem to flag:** the reminder currently copies the approved legal fact word for word: "A landlord must give a Tenancy Information Notice within 28 days of the tenancy starting." That says "starting", which goes against your instruction. Because you don't want legal facts changed, I propose:
- **In-app reminder body.** Old: "{fact} Tenancy at {home} started {date}. Generate it in RoostNI, then mark the date you gave it so these reminders stop." New: "Give the tenancy information notice within 28 days of the tenancy being granted (usually when the agreement is signed). The agreement for {home} was signed on {date}. Generate it in RoostNI, then mark the date you gave it so these reminders stop." When there's no signed date: "…The tenancy for {home} started on {date}…"
- Reminders still only go out while that fact is approved, but its "starting" wording is no longer shown.
- **Email text** (`notification-email.server.ts`): unchanged. It doesn't mention dates.
- **Recommended follow-up (not part of this change):** update the approved fact's wording to say "granted". That would be a legal_facts edit, so I won't make it unless you approve it.

## 4. Audit only: nothing changed

**Rent increases:**
- No on-site page or tool mentions rent increases.
- The only mention is in the blog article "notice-to-quit-northern-ireland-how-landlords-serve-legal-notice", under "Rent Increases and Timing Restrictions". It says:
  - "a landlord cannot increase rent within 12 months of granting a tenancy or within 12 months following the date of the last rent increase"
  - "you must provide written notice of any rent increase using the proper statutory form"
  - "Attempting an unlawful rent hike invalidates attempts to claim rent arrear balances in an eviction action."
- **To check against the Act:**
  - It doesn't mention the 3 months' written notice.
  - The claim that it "invalidates… rent arrear" claims needs a source.

**Smoke, heat and carbon monoxide alarms:**
- Approved legal fact: "Since 1 December 2024, every private tenancy in Northern Ireland must meet the smoke, heat and carbon monoxide alarm rules. The landlord must install sufficient alarms and keep them in proper working order."
- Audit question (`src/lib/audit.ts:83`): "Do you have a valid EPC, and are smoke, heat and carbon monoxide alarms fitted?" The gap it reports: "EPC or alarms not confirmed as in place."
- `/audit` page description: "…EPC and alarms."
- Certificate vault (`property-certificates.tsx:36`): "Smoke, heat & carbon monoxide alarms (interlinked)". Hint: "Record the date the alarms were last checked."
- Health bar label: "Smoke/Heat/CO alarms". Reminder label: "Smoke, heat and carbon monoxide alarm confirmation".
- Blog article "what-every-northern-ireland-tenancy-agreement-must-include": "The Smoke, Heat and Carbon Monoxide Alarms for Private Tenancies Regulations (Northern Ireland) 2024 set alarm requirements for private lets. Check the Department for Communities guidance…"
- **To check:**
  - The word "interlinked" in the vault label.
  - The fact's date (1 December 2024) against the Regulations' commencement date.

## Not touched
Everything else, including the records panel deposit check, legal_facts rows, prices and Robin rules.
