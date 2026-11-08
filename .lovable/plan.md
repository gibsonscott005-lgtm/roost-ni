# Shorter sign-up + email capture on empty searches

Total estimate: about 2–3 credits. That is under your 4.

## Part 1: Shorter sign-up form (about 1 credit)

What the sign-up form asks for now: full name (required), "How did you hear about us?" (optional), email, password, and landlord or tenant.

Changes:
- Remove the full name box from the sign-up form. A name won't be required. Landlords can add it later on their account page, as they can today.
- Hide the "How did you hear about us?" taps. We already record where people come from through campaign links.
- The form will show email, password, and landlord or tenant, followed by the 6-digit code as now.
- Accounts and roles are still created the same way. The sign_up_started and sign_up_completed events stay as they are.

One thing to decide: the password box. Taking it out would mean changing how accounts are created behind the scenes, so the code becomes the sign-in method. You asked me not to change that, so the password stays. If you'd like it gone later, that's a separate change of about 1–1.5 credits, and it touches sign-in for everyone.

Check: any page that shows the name has to cope with it being blank, e.g. "Hi there" instead of "Hi James". I'll make it fall back to the email or a plain greeting.

## Part 2: Email capture on empty searches (about 1–1.5 credits)

The existing alert prompt can be reused with a small change. It isn't a rework. It is currently built around one property (area, bedrooms, rent). I'll let it accept just an area too, so the same form, consent line, subscriber list and unsubscribe link all work.

Changes:
- When a search on the listings page returns no homes, show: "No homes here yet. Get an email when one is listed in [area]." Below it: the email box and the existing consent line, "We'll only email you about new listings in [area]. Unsubscribe any time."
- The area searched is saved with the subscription, along with any bedroom or rent filters already chosen.
- New PostHog events: `property_alert_empty_search_shown` and `property_alert_empty_search_submitted`. They record the area and filters but no email.
- Live alert delivery stays Off. Nothing is sent.

## What could push the cost up
- If the listings search has no single clear area (e.g. free text like "near Omagh"), I'll use the text they typed. Matching it properly to council areas would cost more.
- Testing in a real browser, signed in, adds roughly 0.5 credit for each part. Without it I can only confirm the build passes.
- Any extra wording or layout changes beyond this plan.

## Technical notes
- `src/routes/auth.tsx`: drop the `fullName` input and the hear-about-us fieldset. `full_name` is sent empty or left out of signup metadata. The profile trigger already copes with a missing name; I'll check this when building.
- `src/components/listing-detail-alert.tsx`: export an area-only `AlertForm` variant (no `listingId`) with a new position, `empty_search`.
- `src/routes/listings.index.tsx`: render it in the `filtered.length === 0` empty state.
- `subscribeToListingAlerts` already accepts an optional `listingId`. If it doesn't, I'll make it optional with no change to the database.
