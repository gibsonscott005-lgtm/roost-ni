# Beta Launch: Custom Domain + Polished Onboarding

## Current state

- The app is published at **https://roost-ni.lovable.app** with **public** visibility.
- The "Edit with Lovable" badge is currently visible to visitors.
- No custom domain is connected.
- The latest security scan shows no open findings (you asked me to skip a fresh re-scan).
- Working tree is clean and there are no unresolved TODO/FIXME markers.

## Why I still wouldn't hit "invite" yet

1. The **lovable.app URL** exposes the builder platform and gives the project away to anyone who looks at the address bar.
2. There is **no beta landing surface** — testers will be dropped straight into the auth/sign-up flow with no context, instructions, or way to give feedback.
3. The **Lovable badge** is visible on the public deployment, which undermines the Roost brand for a closed beta.

## What this plan will do

1. **Connect a custom domain** (you provide the domain name below).
   - Update Lovable publish settings with the new domain.
   - Provide the DNS records you need to add with your registrar.
   - Republish the app so testers see `https://your-domain.com` instead of the Lovable URL.

2. **Hide the "Edit with Lovable" badge** (requires a paid Lovable plan; if unavailable, we'll note it and skip).

3. **Build a public `/beta` welcome page**.
   - Short Roost intro and what the beta is for.
   - Role selection: "I'm a tenant" / "I'm a landlord".
   - CTA to sign up at `/auth` with the chosen role pre-selected.
   - Link to a simple beta FAQ and tester expectations.

4. **Add an in-app beta banner**.
   - Shows on first visit for authenticated users with a "How to test" link and a "Send feedback" button.
   - Dismissible and does not block core flows.

5. **Add a feedback mechanism**.
   - Create a `beta_feedback` table (RLS: users can only see/submit their own).
   - Add a feedback modal/form that captures type, message, and optional screenshot note.
   - Surface a count of unresolved feedback to the landlord/admin dashboard only (optional, behind the existing role check).

6. **Create a tester invitation kit**.
   - One-page email/message template with the custom domain, role-specific instructions, and a "report issues" link.
   - Three short test scripts: tenant, landlord, end-to-end lease flow.

7. **Verify the final URL** and confirm the old `roost-ni.lovable.app` still redirects or resolves to the new domain.

## What I need from you

**Please reply with the custom domain you want to use** (e.g. `beta.roostpassport.co.uk`, `app.roost.ni`, `tryroost.com`). If you don't have one yet, register it first, then tell me the exact domain.

## What I'm not touching

- No new features, pricing changes, or workflow changes.
- No new security scan or full regression test (per your "No, proceed now" answer).
- No paid API integrations unless requested.

## Estimated size

Small-to-medium. Mostly frontend, configuration, and a single database table.
