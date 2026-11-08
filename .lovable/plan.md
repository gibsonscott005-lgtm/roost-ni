# Six-part plan with credit estimates

The build and testing estimates are listed separately. Nothing in legal_facts, the deposit return wording or anything else outside these six parts will change.

## 1. Progress bar on tenanted property cards — build 0.3–0.5
- The tenancy records panel already counts "X of Y done". I will move that count into one shared helper so the card and the panel always agree.
- The dashboard card shows "7 of 11 done" with a thin bar, only for existing tenancies that still have items missing. Once everything is done, the bar disappears.
- Clashes: none. The TIN item still counts only as "Landlord says a notice is on file", never as compliant.

## 2. Tenant invite by email — build 2.5–3.5
- From Manage Tenancy, the landlord enters the tenant's email and sends an invite. It goes as a fixed app email containing a single-use link that expires after 14 days.
- The tenant opens the link, then signs up (email, tenant role, 6-digit code) or signs in. The server checks that the invite email matches the signed-in account, attaches the tenant to the existing tenancy and marks the invite used.
- The tenant can then see receipts, maintenance and notices for that tenancy only. Their passport documents stay private.
- New invite table with admin/landlord-only access. Attaching is done only through one database function.
- **Sign-up clashes:**
  - The invite has to survive the email-code step. I will carry it in the existing `next=` link the way the tenanted-home button does, and re-check the email after the code is confirmed.
  - If the tenant signs up with a different email, attaching is refused and they see a plain message.
  - Sign-up still asks for a password, as it does today.
- **Founder tracking clashes:** none. Founding places are counted by home address, and inviting a tenant adds no home. Tenant sign-ups from invites will be logged as a separate PostHog event so they don't inflate landlord funnel figures.

## 3. Homepage FAQ: two landlord questions — build 0.2–0.3
Approved legal_facts rows exist for both questions, so I will use their wording and not your fallback text.
- **"How much notice do I have to give?"** uses approved facts 5e5c794d (4 weeks, up to 12 months), cd97232f (8 weeks, over 12 months up to 10 years), 852ca216 (12 weeks, over 10 years), 70c45aee and a91ae565 (tenant: 4 weeks up to 10 years, 12 weeks over 10 years). The longer proposed periods (fact b15ab697) are not mentioned.
- **"Is there a limit on the deposit?"** uses approved fact 37805b93, word for word: "A tenancy deposit must not exceed one month's rent."
- The FAQ structured data for search engines is updated to match.

## 4. Blank-name check — build 0.5–0.8
- Every greeting will be audited: the welcome-landlord email, notification and reminder emails, identity-check emails, the dashboard shell and home screen, passport pages, applications, the tenant tenancy page, and the lease issue and review pages.
- One shared helper returns "Hi Jane" when there is a name, and "Hi there" (emails) or no greeting (in the app) when the name is empty, only spaces, or "undefined"/"null".
- Clashes: none.

## 5. Microsoft Clarity — no build yet
- **What I need from you:** the Clarity project ID (a short code shown in Clarity under Settings > Setup).
- **Cost:** Clarity is free with no paid tier, so it fits the zero-cost rule. Adding it would be about 0.3 credits: it loads only on the live site, skips internal test accounts the same way PostHog does, and the privacy notice gets a line about it.
- **Note:** PostHog already records sessions, so Clarity would duplicate that. Nothing will be added until you send the ID.

## 6. SEO tune-up — pick any
| # | Change | Build |
|---|---|---|
| a | Rewrite titles and descriptions for the 6 tool pages (/audit, /notice-to-quit-ni, /tenancy-information-notice-ni, /rent-receipts-ni, /landlord-registration-ni, /list-property) around NI search terms | 0.3 |
| b | One clear main heading per page, plus a check of heading order on those pages | 0.2 |
| c | "Related tools" links between the calculators, the blog and the homepage | 0.3 |
| d | Sitemap: add published blog articles automatically with last-updated dates | 0.2 |
| e | Blog articles: article structured data (author, date) for Google | 0.2 |

Any legal wording in these changes will come only from approved facts.

## Build total
Parts 1–4 come to about **3.5–5.1** credits, plus Clarity (0.3, if you want it) and the SEO items you choose (up to 1.2).

## Testing (separate estimate)
| Part | What I can verify | What you check | Test credits |
|---|---|---|---|
| 1 | Unit test of the count. A signed-in browser check of one existing tenancy card using my test session; I would create one test existing-tenancy record, which I can delete afterwards | How it looks on your phone | 0.3 |
| 2 | Unit tests for the invite rules (single use, expiry, email must match). Two browser runs: landlord sends an invite, then a second test tenant account accepts it. This needs a second test account, and the 6-digit code arrives by real email, so I may need your help to read it | That a real invite email arrives in your inbox, and the tenant view on mobile | 0.8–1.2 |
| 3 | Read the homepage HTML and confirm the FAQ text matches the facts exactly | Wording sign-off | 0.1 |
| 4 | Unit test of the greeting helper (blank, spaces, "undefined"). A preview of each email with an empty name | One real email to a nameless account | 0.3 |
| 5 | Confirm Clarity loads on the live site only and not for test accounts | That recordings appear in your Clarity dashboard | 0.1 |
| 6 | Read the titles, descriptions and sitemap back | Rescan in the SEO tab, and Google Search Console | 0.1–0.2 |

Testing for parts 1–4 comes to about **1.5–1.9** credits.

These figures are estimates. I can't see the cost of a single turn, so check your usage page after each build.
