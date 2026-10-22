# "Free" wording audit, central copy config, and "How RoostNI is funded" page

Approved line (used everywhere a pricing statement appears):
**"Core tools are free forever. Optional paid services are always opt-in and clearly priced."**

Searched: all pages, page titles and meta, Open Graph/Twitter tags, JSON-LD, sitemap, `llms.txt`, all 10 email templates, Robin's prompts and knowledge, help/FAQ, footers, banners, dashboards and outreach templates. The sitemap itself has no pricing wording.

## 1. Audit

### (a) Must change: absolute or outdated claims

| File | Current wording | Proposed replacement |
|---|---|---|
| `routes/index.tsx` ticker (and `components/brutal` TICKER_TEXT) | "NO AGENT FEES. EVER. // NO COMMISSION. NO CATCH." | "NO COMMISSION ON RENT // CORE TOOLS FREE FOREVER // BUILT FOR NORTHERN IRELAND LAW" |
| `index.tsx` title | "…No Agent Fees \| RoostNI" | "Let & Rent Direct in Northern Ireland, No Commission \| RoostNI" |
| `index.tsx` meta description | "…Free, with zero agent commissions." | "…Core tools are free forever, with no commission on rent." |
| `index.tsx` twitter:description | "Free direct management with zero agent commissions." | "Direct renting for Northern Ireland. Core tools are free forever." |
| `index.tsx` JSON-LD SoftwareApplication | description "Free to use, with zero agent commissions"; Offer price "0", "Free direct management, zero agent commissions" | Description ends "Core tools are free forever; optional paid services are opt-in." Offer stays price "0", name "Core tools", description = approved line |
| `index.tsx` green box | "Free direct management. No agent fees. No commissions. No catch." | The approved line |
| `index.tsx` stat | "£0 / Agent fees, free direct management" | "0% / Commission on your rent" |
| `audit.tsx` (lines 186, 324) | "RoostNI offers free direct management… No fees, no card…" | "Core tools are free forever, including every compliance tool. Optional paid services are always opt-in and clearly priced." |
| `audit.tsx` (481, 574) | "Free direct management. Zero agent commissions, no card required." | "Core tools are free forever. No commission on rent, no card needed to start." |
| `landlord-registration-ni.tsx:312` | "free direct management… no fees, no card" | Same as the audit wording |
| `notice-to-quit-ni`, `tenancy-information-notice-ni`, `rent-receipts-ni` closing boxes | "free, with zero agent commissions" | "Core tools are free forever, with no commission on rent." |
| `list-property.tsx` og:description and badge (37, 141) | "Free, with zero agent commissions" / "Free direct management • Zero agent commissions" | "Free to list • No commission on rent" |
| `list-property.tsx:32` | "No agent fees, deposits checked…" | "No upfront listing fee, deposits checked…" |
| `listings.$id.tsx:92` (meta per listing) | "Direct rental with zero agent fees." | "Let direct by the landlord. No fees to apply." |
| `listings.$id.tsx:480` | "Free for renters — no fees" | "Never any fees for tenants" |
| `auth.tsx:686` | "Free · Zero agent commissions · Encrypted…" | "Core tools free forever · No commission · Encrypted…" |
| `dashboard.index.tsx:1054` | "Free direct management • Zero agent commissions" | "Core tools free forever • No commission on rent" |
| `dashboard.index.tsx:2134` | "100% Free for Tenants • No Agency Application Fees…" | "Never any fees for tenants • No fees to apply • Reusable across NI" |
| `beta.tsx` (68, 207) | "Free · Zero agent commissions" / "Free direct management, zero agent commissions." | The approved line |
| `beta-feedback.tsx:209` | "Free direct management, zero agent commissions…" | "Core tools are free forever. Tell us anything that could be better." |
| `help.tsx:87` FAQ | "Core direct management is free… nothing is charged today." | Approved line, plus "Nothing is charged today. See How RoostNI is funded." |
| `email-templates/welcome-tenant.tsx:47` | "RoostNI is free for renters — no fees, no card required" | "RoostNI never charges tenants, so if anything is unclear…" |
| `email-templates/welcome-landlord.tsx:53` | "free direct management with zero agent commissions" | "Core tools are free forever, with no commission on your rent, so if…" |
| `marketing.functions.ts:645` (Robin rule) | "It is free during the open beta." | "Core tools are free forever; optional paid services are opt-in. Never say '100% free', 'zero fees' or that a paid service exists." |
| `marketing-knowledge.ts:40` | "completely free during the public beta" | The approved line, and a ban on "100% free", "zero fees" and "no catch" |
| `marketing-knowledge.ts:115, 121` | "£0 in beta… leaning into the £0 direct model" | "no commission on rent; core tools free forever" |
| `marketing-knowledge.ts:144, 217` | "join the free beta" / "free in beta" | "About RoostNI" / "core tools free" |
| `public/llms.txt:24` | "How to join the free beta." | "About RoostNI and how it is funded" (also link the new page) |
| `docs/beta-outreach-templates.md` (45, 70, 104–153, 194, 205) | "free renting platform", "free during early beta — no fees, no card" | "RoostNI is a Northern Ireland renting platform. Core tools are free forever." Remove all beta and "no fees" phrases |
| `dashboard.admin.tsx:168` | "Free early beta" | "Core tools free" (admin-only, but it breaks the no-beta rule) |

### (b) Fine as is
- Statutory facts: TIN "free of charge", Notice of Variation "free", rent receipts "at no charge", deposit scheme "free dispute" service, and the "Free" stat boxes on the guides. These describe the law, not RoostNI.
- Tool labels: "free calculator", "Free rent receipt generator", "Free self-check", "Run Free Landlord Audit", "free listing alerts", "Free NI tools — no sign-up", "Take the free 5-question check". These tools are permanently free.
- "Create a free Tenant Passport / free account", "List it free", "Sign up free & publish", "Try RoostNI free", and the auth meta "Create a free Tenant or Landlord account". Listings, passports and accounts are permanently free.
- `pricing.ts:130` "The free self-certified route always remains available."
- `pricing-breakdown.tsx:53` "Core direct management stays free, and nothing…" Fine, but switch it to the approved line from the config.
- "Let direct, no agent fee" (`audit.tsx:404`). True: there is no agent.
- `tax-free`, `£0.00` deductions, `Free text` search hint. These are unrelated.

### (c) Unsure: need your call
- **"No middleman. No agency tax."** (homepage hero). This is not a fee claim, but "No agency tax" could read as "no charges". Suggest keeping it.
- **Homepage "£0" stat.** Suggest "0%" for commission, as in table (a). Alternatively "£0 / To list or apply".
- **Og:title "List a property free in Northern Ireland."** True today; keep it?
- **`identity-webhook.ts` comment** "testing for free". Internal code comment only; suggest a tidy-up.
- **Stored Robin posts already in the database.** These haven't been read yet. The build step would query saved drafts and scheduled posts for the banned phrases and list them for you to edit or delete. Published Facebook posts can't be changed from here.

## 2. Central copy and plans config

Add one file, `src/lib/plans-copy.ts`, with no pricing anywhere else:

- `APPROVED_LINE`: the full approved sentence
- `SHORT_LINES`: badge and ticker variants (`coreFree: "Core tools free forever"`, `noCommission: "No commission on rent"`, `tenantsNeverPay: "Never any fees for tenants"`, `freeToList: "Free to list"`)
- `PERMANENTLY_FREE`: listings, tenant passports, applicant inbox, tenancy management, rent ledger and receipts, maintenance tickets, all statutory tools
- `PLANS`: `{ id: "core", name: "Core", status: "live", price: 0 }`, plus planned entries (Pro for 5+ properties, listing boost, verified badge, rent collection, trade and insurance referrals). Each has `status: "planned"` and `price: null`, and a helper so planned items can only show "possible future option" wording
- `BANNED_PHRASES`: "100% free", "zero fees", "no fees", "no catch", "free during beta". Robin's checker and a small test use this list
- `FUNDING_PAGE_PATH = "/how-roostni-is-funded"`

Files that would use it: homepage (ticker, box, stats, meta, JSON-LD), `components/brutal`, audit, the four NI guides, list-property, listings.$id, auth, beta/about, help FAQ, beta-feedback, dashboard.index, dashboard.admin, pricing-breakdown, both welcome emails, `marketing.functions.ts` and `marketing-knowledge.ts` (Robin's prompt and phrase filter), the footer links and `sitemap`.

`src/lib/pricing.ts` (the existing simulated optional-service catalogue) stays as is, but its labels read their status from `PLANS` so nothing can show as live by mistake.

Tests: (1) `BANNED_PHRASES` never appears in the Robin system prompt; (2) every `PLANS` entry except `core` is `planned` with no price.

## 3. New page: "How RoostNI is funded"

- URL: `/how-roostni-is-funded`. Linked from the homepage footer, the About/beta footer, the help FAQ answer and the dashboard footer, and added to the sitemap and `llms.txt`.
- Style: the same tilted green tag, big heading and cream/green boxes as the other content pages, with its own title, meta and OG tags.

### Draft copy

**Tag:** // How RoostNI is funded

**Heading:** Straight answers about money.

**Intro:** RoostNI is built in Northern Ireland for landlords and tenants who'd rather deal with each other directly. We think you should know exactly how a service like this pays its way, so here it is in plain English.

**Green box:** Core tools are free forever. Optional paid services are always opt-in and clearly priced.

**What stays free, permanently**
- Property listings
- Tenant Passports
- The applicant inbox
- Tenancy management
- Rent ledger and rent receipts
- Maintenance tickets
- Every statutory tool: the compliance check, the Notice to Quit calculator, the Tenancy Information Notice help and the cash rent receipts

These aren't trial features, and we won't take them away later.

**The law is never behind a paywall**
If a tool helps you meet your legal duties in Northern Ireland, it stays free. That includes anything that produces a notice, receipt, reminder or record you need to keep. You'll never have to pay to stay compliant.

**What might cost money in future**
We may add optional extras later on. Examples include tools for landlords with five or more properties, or help from trusted local providers. If we do:
- they'll always be opt-in, and you'll never be moved onto them automatically
- the price will be clear before you choose
- they'll be paid for by landlords or by the outside providers involved
- we'll never take a percentage of your rent
- tenants will never be charged a fee to apply or to use RoostNI

None of these extras are available today. Nothing is charged right now.

**Referrals**
If we ever recommend a tradesperson, insurer or other provider and they pay us for that introduction, we'll say so clearly beside the recommendation. Your Tenant Passport details are never shared for marketing or referrals without your clear permission.

**Cream box: Questions?**
If something here isn't clear, email support@roostni.co.uk. A real person in Northern Ireland will reply.

**Footer note:** RoostNI provides general information, not legal advice. Check current guidance at nidirect.gov.uk.

## Technical details
- New route file `src/routes/how-roostni-is-funded.tsx` with `staticData: { sitemap: true }`, a canonical link and an OG image only if an absolute image exists (otherwise none).
- The copy changes are text only. No layout, flow or database changes, apart from the read-only query of Robin's saved posts.
- Update the project memory with the approved line and the banned phrases.
