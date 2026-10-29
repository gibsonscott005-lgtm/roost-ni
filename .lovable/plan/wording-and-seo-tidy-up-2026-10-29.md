# Wording and SEO tidy-up

Text and head tags only. No legal facts, prices, tool logic, Robin or database changes.

## Changes
1. **/beta** (`src/routes/beta.tsx`): new title/og/twitter title and description as given; replace the "Nothing is charged…" line with the billing line, with "How RoostNI is funded" linking to /how-roostni-is-funded; button becomes "Create your account".
2. **/listings** (`src/routes/listings.index.tsx`): new intro line; "{n} listings live." becomes "Example listings"; new meta/og/twitter description.
   **/listings/$id** (`src/routes/listings.$id.tsx`): add `robots: noindex` in head() only when the listing title starts with "[TEST LISTING".
3. **Homepage** (`src/routes/index.tsx`): landlord card body starts "List your home in minutes. Founding landlords get a month free." (rest unchanged); add one short line linking to /how-roostni-is-funded: "First 20 landlords to list: one month free, then £5 a month, locked for 24 months."
4. **Buttons**: "Try RoostNI free" becomes "Create your account" on /notice-to-quit-ni and /tenancy-information-notice-ni only (rent receipts page left alone as asked).
5. **/landlord-registration-ni**: "4 weeks under 12 months" becomes "4 weeks for 12 months or less"; "Twelve questions" becomes "Five questions".

## Wording I'll use exactly as you wrote it, but flagging
- The /beta description says "compliant listings" and "platform". Your earlier rules ban both on new screens. I'll use your text as written unless you tell me otherwise.
- The /listings description says "free listing alert". This is about tenants, so it fits "never any fees for tenants", but it does use the word "free".
- The homepage line "£5 a month" leaves out the £3 for each extra home and the £49 cap. The linked funding page explains those.

## Checks
Read the changed pages in the preview HTML to confirm the new titles, wording and noindex tag. Estimate: about 1 credit.
