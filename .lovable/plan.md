# Pre-LANI Outreach Readiness Sweep

## Goal
Run a final end-to-end audit before the LANI introduction email goes out, so the first external visitors to `roostni.co.uk` see a stable, complete public experience.

## Checks

1. **Build and type health**
   - Run the production build / typecheck and confirm zero blocking errors.

2. **Public entry points**
   - `/` — marketing landing page loads, messaging is clear, no redirect to `/auth` for anonymous users.
   - `/beta` — onboarding page loads and explains the beta, role split, and ground rules.
   - `/help` — help centre loads and NI-specific FAQs are readable.

3. **Beta sign-up flow**
   - Sign up as a tenant, complete the passport wizard, and apply to a listing.
   - Sign up as a landlord, create a listing, and view the application.
   - Confirm no broken steps, missing data, or confusing dead-ends.

4. **Security findings**
   - Pull the latest scan results.
   - Confirm no unresolved critical findings that would block external traffic or expose data.

5. **Email delivery**
   - Verify transactional email `reply_to` is set to `support@roostni.co.uk`.
   - Confirm the Lovable sender domain is active and auth/app emails route correctly.

6. **Console and runtime errors**
   - Check browser console and server logs for unhandled errors on the routes above.

## Outcome
A short report of what passed, what needs a fix, and whether the app is ready for LANI traffic. Any blocking issue will be fixed in the same sweep; non-blocking gaps will be listed for the next cycle.
