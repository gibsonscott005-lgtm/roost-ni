---
name: Tenant listing alerts
description: How "new listing" email alerts work — public capture on /listings, owner heads-up email per publish, manual BCC follow-up (no bulk sends)
type: feature
---

Tenant listing alerts (added 2026-09-28 to fix 0% retention from Facebook traffic):

- Sign-up box sits at the top of the public `/listings` page (email only, no account). Rows land in `listing_alert_subscribers` (unique email, anon INSERT policy, admins-only read).
- When a landlord publishes a listing (all three publish paths), `notifyListingPublished` sends ONE operational email to the site owner's fixed address via the `listing-published` template, including the subscriber count. Best-effort, deduped per listing per day.
- Deliberately NO automated bulk email to subscribers: Lovable app email is transactional-only (one trigger → one recipient). The owner copies subscriber emails from the Command centre "Tenant alerts" tab ("Copy all emails") and BCCs them from his own mailbox.
- Sign-up tracked in PostHog as `listing_alert_signup` with UTM params.
