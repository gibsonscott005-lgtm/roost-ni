# Tracking fixes and homepage remainder

Total estimate: about 3.5–5 credits if all four items are built together in one pass. It only goes over 5 if the extras listed at the bottom come into play.

## Part 1 — PostHog tracking

**1a. Sign-up completed and property added — about 0.8–1.2 credits**
- `sign_up_completed` fires once, when the 6-digit email code is accepted and the account exists. It sends the account type (landlord or tenant) and the existing campaign details. This is in the sign-in page.
- `property_added` fires whenever a landlord saves a new home. It sends whether the home is tenanted, whether it is listed or private, and whether a tenancy record was set up. It never sends the address.
- `sign_up_started`, `list_property_published` and every `property_alert_*` event stay exactly as they are.

**1b. Linking visitors to accounts — about 0.6–0.9 credits**
- Visitors are linked to their account on sign-in and whenever a saved session comes back, using the account ID only. No email and no name are sent.
- Visitors are unlinked on sign-out from all three sign-out buttons (dashboard menu, dashboard home, settings).
- The existing internal/test-user tag stays.

## Part 2 — Homepage

**2a. FAQ, landlords first — about 0.8–1.2 credits**
Five questions near the bottom of the homepage. Each answer is short and plain, and the legal answers use only approved facts:
1. What must a landlord give a tenant in Northern Ireland? A Tenancy Information Notice, free of charge, within 28 days of the tenancy being granted.
2. How do deposits work in Northern Ireland? The deposit goes into TDS NI or MyDeposits NI within 28 days of receiving it. The tenant gets the prescribed information within 35 days.
3. Do landlords need to give receipts for cash rent? Yes. The receipt shows the amount, the date, what it was for and any balance outstanding.
4. What does RoostNI cost? Pulled from the plan data. It includes the founding offer wording and the note that billing is not switched on yet.
5. Does RoostNI vet tenants? No. RoostNI organises the evidence an applicant gives, so the landlord can check it directly. Tenants never pay.

**Left out on purpose: notice periods and the deposit cap.** Both are approved in the facts table, but your earlier rules said not to state notice periods without your sign-off, and not to call the deposit cap a "must". Tell me if you want either one added.

This will be a plain on-page FAQ with no FAQ markup for Google, which follows the project's earlier SEO guidance.

**2b. Prices and steps as a table and list — about 0.6–0.9 credits**
- A small price table with two columns, Standard and Founding. The rows are first home, each extra home and monthly cap.
- Under the table go the founding offer line and the billing-not-on note. All figures and wording come from the central price files. No 'free forever'.
- The how-it-works steps become a numbered list.

The 'move a tenanted property' button is not added.

## What could push the cost up
- If the homepage price section is built differently from the central price data, it may need a small change to how the price files share their figures: about +0.5.
- Testing in a signed-in browser to watch the events fire: about +0.5–1. Instead, I'd run a code check and a homepage screenshot, and you check the events in PostHog after publishing.
- Rewriting FAQ answers after review: about 0.3 for each round.

To stay safely under 5, drop 2b or the browser test.

## Technical notes
- Files: `src/routes/auth.tsx` (after `verifyOtp` succeeds), the home-save handlers in `list-property.tsx` and the add-home flow, `src/hooks/use-auth.ts` (`posthog.identify(user.id)` on `SIGNED_IN` and `INITIAL_SESSION`), and the three `signOut` call sites (`posthog.reset()`). Also `src/routes/index.tsx`, with plain FAQ markup and the price table built from `PLANS` and `SHORT_LINES` in `plans-copy.ts` and `pricing.ts`.
