# New pricing wording and plan data

Text and data only. The only page whose layout changes is "How RoostNI is funded".

## 1. One new approved line
Central wording file (`plans-copy.ts`) becomes:
- Approved line: "Every tool is included at every level. Pay by the number of homes you manage. No commission on rent. Never any fees for tenants."
- Billing note: "Billing is not switched on yet. Nothing is charged today."
- Statutory note: "Statutory tools stay open to everyone."
- Short lines kept: "No commission on rent", "Never any fees for tenants". Removed: "Core tools free forever", "Free to list", and the "permanently free" list (listings, tenancy management, rent ledger, maintenance tickets).
- Ticker becomes: NO COMMISSION ON RENT // NEVER ANY FEES FOR TENANTS // BUILT FOR NORTHERN IRELAND LAW.
- Plan catalogue replaced with Standard and Founding (status: not yet billing).

## 2. Replace old wording everywhere
Homepage (text, meta tags, JSON-LD offer — no "price 0"), list-property page, audit page (two hard-coded lines), TIN / notice to quit / rent receipts / landlord registration guides, beta page, help FAQ, sign-in page footer, beta feedback box, landlord dashboard and Command Centre footers, llms.txt, landlord welcome email (tenant welcome checked too), and the beta outreach templates document.

## 3. Rewrite "How RoostNI is funded"
Sections: the approved line; "Billing is not switched on yet"; Standard (£7 a month for your first home, £4 each extra home, never more than £59); Founding landlords (first 20 who list a property: one month free from the day they list, then £5 first home, £3 each extra, never more than £49, price locked for 24 months); how a home is counted (by address, stays counted until sold or archived for 12 months); statutory tools open to everyone; never any fees for tenants; no commission on rent; referrals paragraph kept. Small worked examples (1, 3 and 10 homes) pulled from the same numbers.

## 4. Pricing data clean-up
- Remove the four old tiers, completion fees (£39/£19/£9/£15), per-document charges and the £5 ID check from `pricing.ts` and from the database tables.
- Replace with the Standard and Founding formulas and caps, in pence, with a tested `monthlyPrice(homes, plan)` function.
- Settings billing preview and the pricing preview panel show the new monthly figure only (no completion fee or document rows), still marked "not switched on yet".
- Paid identity check: the paid option is removed so tenants are never asked for £5. The self-certified passport stays exactly as it is.

## 5. docs/positioning.md
"Who pays" rewritten: landlords pay by the number of homes they manage; tenants never pay. The two-sided balance section drops "a tenant fee for the passport" and the "paid identity check" exception.

## 6. Robin
- Funding line updated to the new approved line.
- Banned list adds "free forever", "core tools are free", "free to list". "No commission on rent" and "Never any fees for tenants" explicitly allowed.
- Existing queued drafts are not rewritten; re-draft to pick up the change.

## Also updated
Project memory pricing rule and project knowledge note to the new line (the old "free forever" rule would otherwise fight this change). Tests: new line passes the banned check; Standard and Founding prices and caps (e.g. 1 home £7, 3 homes £15, 20 homes capped £59; Founding 1 home £5, cap £49); no tenant fee anywhere.

## Assumptions to confirm
- "One month free" for Founding landlords appears only on the funding page as stated; elsewhere Robin's "free" ban still applies.
- The paid £5 identity check is removed entirely rather than kept at £0.

## Credit estimate
Roughly 4 to 6 credits: about 25 files of wording swaps, one database update, one page rewrite and tests, in a single pass.

## Technical notes
Migration deletes rows from `pricing_items` and replaces `pricing_tiers` seeds; `completion_fee_pence` column left in place at 0 to avoid schema churn. `identity-verification.ts` stops importing a biometric price. Nothing posted or emailed.
