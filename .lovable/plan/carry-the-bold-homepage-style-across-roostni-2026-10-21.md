# Carry the bold homepage style across RoostNI

Bring the homepage's look (dark canvas, emerald highlights, cream and green callout boxes, sharp borders, heavy headings) to every page, in four stages. No workflow, wording rule, legal content or link changes — this is visual only.

## Shared building blocks (done first)

Small reusable pieces so every page looks consistent:
- Section label in the "// Label" mono style
- Bordered stat box (big emerald number + outlined caption)
- Green and cream callout boxes (speech-bubble style for marketing pages, plain boxed for app screens)
- Sharp bordered card with hard offset shadow
- Shared site header (logo, bordered Sign-in) and footer with the not-legal-advice / nidirect.gov.uk note
- Optional slim ticker strip for public pages only

## Stage 1 — Public discovery
- Listings browse: bold heading, bordered filter bar, sharp listing cards, emerald rent figures
- Listing details: boxed key facts (rent, deposit, beds, heating, LRN), emerald callout for the Passport apply gateway, test-listing notices kept
- Compliance audit: boxed questions, emerald score callout
- Four NI guides (Notice to Quit, TIN, Rent Receipts, Landlord Registration): headline stats boxed (28 days, 4/8/12 weeks), calculators in bordered panels

## Stage 2 — Conversion journeys
- Sign-in / sign-up, password reset
- List a property (signed-out form)
- About page (/beta)

Forms keep calm, legible inputs — the bold styling sits around them, not inside them.

## Stage 3 — Dashboards
- Tenant and landlord dashboard overviews and onboarding checklists
- Passport wizard and passport view
- Application review screen and passport slide-over
- Tenancy workspace (compliance health bar, rent ledger, maintenance), lease issue/review, tenancy hub

Dense screens get the frame (headings, borders, stat boxes) but keep readable tables and body text; no ticker or speech bubbles here.

## Stage 4 — Supporting pages
- Help, settings, admin (incl. Robin), notification panel, error and not-found pages

## Checks after each stage
- Phone (375px) and desktop screenshots of every changed page, no sideways scrolling
- Existing flow tests re-run (public pages, listing form, applications, landlord workspace, lease)
- No "beta" wording, no English legal terms, emerald text readable against the dark ground

## Decisions needed from you
- Do all four stages in one go, or pause for your review after Stage 1?
- Self-certified badges currently share the emerald colour with marketing highlights; I'd keep them distinguishable with an outlined badge shape.

## Technical details
- New shared components in `src/components/brutal/` (SectionLabel, StatBox, Callout, BrutalCard, SiteHeader, SiteFooter); reuse `brutal-bubble`, `brutal-ticker`, `--paper` tokens from `src/styles.css`.
- Semantic tokens only; elevation via `shadow-raised` / `shadow-verified`.
- shadcn Card/Button/Badge variants updated once so dashboards inherit the style without per-page rewrites.
- Head metadata on each route unchanged.
- Preview only until you publish.
