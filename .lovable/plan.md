# What's left to complete in this first build

Roost is live at roostni.co.uk with the full journey wired end to end: sign-up, self-certified passport, listings with NI fields, applications and withdrawal, lease issue/sign/counter-sign, tenancy workspace, rent ledger, deposit protection, inventory, maintenance, certificates, end-of-tenancy, notifications, scheduled reminders, beta onboarding, help centre and the MCP agent integration.

What remains falls into three buckets.

## 1. Simulated, not real (deliberate — decide when to switch on)

- **Identity verification** is modelled on a provider flow but returns simulated results. Going real needs a live provider account and the tenant-pays charge.
- **Payments** are held for now per the user's approval decision.

## 2. Needs verifying before wider use

- **Outbound email**: high-priority notifications and reminders call Resend, but no `RESEND_API_KEY` is present in this environment, so those emails are silently skipped. Either add the key and send a test, or make the fallback visible so nobody assumes an email went out.
- **Daily reminder job**: scheduled via pg_cron at 08:00. Worth confirming recent runs in `reminder_log` rather than assuming it fires.

## 3. Genuine product gaps (approved for this build)

- **Landlord cannot download a signed custom-PDF lease** the way the Roost standard template can be printed.
- **Tenant has no view of past/ended tenancies** — the workspace only shows the current one.
- **No admin view.** `account_type` includes `admin` but there is no screen to review beta feedback, listings, or users; feedback currently has to be read from the database.
- **Notification preferences are partial** — the settings page exists, but not every notification type is mutable.
- **Homepage is a redirect.** `/` bounces straight to `/auth`, so roostni.co.uk has no public landing page explaining Roost to a cold visitor arriving from search or a LANI email. `/beta` is doing that job by accident.

## Suggested order

1. Public landing page at `/` (biggest external-facing gap now the domain is live)
2. Email delivery verified end to end
3. Signed custom-PDF lease download + tenant past-tenancies view
4. Lightweight admin view for beta feedback
5. Notification preferences completion
6. Real identity verification and payments when you're ready to charge

## Technical notes

Items 1–5 are frontend plus small server-function work; no schema changes except possibly an admin read policy. Payments and identity are the only items requiring external accounts.
