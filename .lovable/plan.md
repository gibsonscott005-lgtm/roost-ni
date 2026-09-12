# Organic NI tester recruitment push

## Goal
Get the first 5–10 real testers (a mix of tenants and landlords) from Northern Ireland Facebook/community groups after the LANI email produced no reply and zero site traffic.

## Why this route
- No budget or paid ads required.
- NI landlord and tenant groups are active and self-select by role.
- A short, honest "research and feedback" post is less likely to be flagged as spam than a product pitch.

## What we will build

1. **Make cold traffic convert**
   - Add 2–3 clearly labelled "beta example" listings to the live browse page so the site does not look empty.
   - Add a short "How did you hear about us?" field at sign-up (optional dropdown: Facebook / friend / search / other) so we can see which groups work.
   - Ensure `/beta` and `/help` are linked from `/listings` and `/auth` for people who land mid-flow.

2. **Outreach kit**
   - Write 3 short post templates:
     - Tenant-focused: "Tired of re-typing your details for every NI rental?"
     - Landlord-focused: "Self-managing a tenancy in NI on messages and spreadsheets?"
     - Mixed/general: "We're testing a NI renting workspace — looking for feedback."
   - Prepare a 1-to-1 message script for people who comment or express interest.
   - Keep the tone research-first, not sales-first; no endorsement request.

3. **Light incentive (optional, low-friction)**
   - Offer the first 10 people who complete a 10-minute feedback call a £10 coffee voucher.
   - Or keep it voluntary-only if preferred. Decide before the first post.

4. **Group targeting**
   - Aim for 3–5 groups:
     - 1–2 Northern Ireland landlord/self-managing landlord groups.
     - 1–2 NI tenant/renting/housing groups.
     - 1 local community group where housing comes up naturally.
   - Post once per group, then reply to comments; do not cross-post repeatedly.

5. **Tracking and follow-up**
   - Use UTM links (e.g. `https://roostni.co.uk/beta?utm_source=facebook&utm_medium=social&utm_campaign=beta-sep`).
   - Watch PostHog for traffic spikes and sign-up events.
   - After 3 days, reply to every comment; after 7 days, send a single follow-up in the same thread if the post is still active.

## What we will NOT do
- No paid ads or promoted posts.
- No bulk automated messaging.
- No fake testimonials or invented user numbers.

## Success metric
- 5 landlords and 5 tenants signed up and at least one role completed (passport created or listing added) within 14 days of the first post.

## Technical details

- Demo listings: create them through the live landlord UI using a founder/admin account, or add a small seed script if the environment needs repeatable data. Each listing must be clearly tagged as a "Beta example — not a real let" in the title/description.
- Sign-up source question: add an optional `hear_about_us` field to the sign-up form and store it on the profile (no schema change if profile has metadata JSON; otherwise a lightweight column addition).
- UTM tracking: append query params to the `/beta` link in posts; existing links already preserve search params through to `/auth` role selection.
- PostHog: ensure the `$pageview` event fires on `/beta` and sign-up events are captured; add a custom `beta_sign_up_source` property when the source field is filled.

## First step
Approve this plan, then I will prepare the outreach templates and make the site tweaks (demo listings + source tracking) before you post anything.
