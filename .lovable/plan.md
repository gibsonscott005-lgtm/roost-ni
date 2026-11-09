# Cookie consent: where RoostNI stands today (read-only findings) and a proposed setup

Nothing has been changed. Below are the findings, then a proposed build for you to approve or skip.

## 1. Consent banner or preference setting today
- **None for visitors.** There is no cookie banner, no "Cookie settings" link and no consent record anywhere on the site.
- The only on/off switch is in the **admin dashboard** ("exclude this device" from analytics, which uses PostHog's opt-out). It's an internal tool for leaving test devices out of the figures, not a visitor choice.

## 2. How PostHog starts
- PostHog starts on **every page as soon as it loads**, for every visitor, before any choice is made (it's started from the site-wide layout).
- Settings in code: autocapture **on** (clicks, form interactions), page leave tracking **on**, a page view sent on load.
- **Storage:** no persistence setting is chosen, so PostHog's default applies: a first-party cookie (`ph_<project key>_posthog`, roughly a year) plus matching localStorage, holding an anonymous visitor ID and session details.
- **Session replay:** the code doesn't switch it off, so it follows your PostHog project setting. Your project notes say replay is on, which means it records from the first page view. I can't read the PostHog project settings from here, so this part is **not verified**.
- **Opt-in, opt-out or cookieless options:** none are used (`opt_out_capturing_by_default`, `persistence: "memory"`, cookieless mode). The only opt-out is the admin device switch above.
- Lovable's built-in visitor analytics also runs on the live site. It uses no cookies and stores nothing on the device.

## 3. Everything else the site stores in the browser
| Item | Where | Purpose | Category |
|---|---|---|---|
| Sign-in session (`sb-…-auth-token`) | localStorage | keeps you signed in | Strictly necessary |
| `roost_welcome_pending` | sessionStorage | shows the welcome step after sign-up | Necessary (functional) |
| `roostni_listing_draft` | localStorage | saves a half-written listing | Necessary (user-requested) |
| `roost:deposit-reminder:…` | localStorage | stops the same deposit reminder showing twice a day | Necessary (functional) |
| `roostni_audit_last` | localStorage | remembers your last health check score | Functional (low risk, arguably necessary) |
| `roost.beta-banner.dismissed` | localStorage | remembers that you closed the beta banner | Functional |
| Listing alert done/dismissed flags | sessionStorage | stops the alert prompt repeating | Functional |
| `roost_admin_tab`, `roost_last_copied_post`, Robin results draft | session/localStorage | admin screens only | Functional (admin only) |
| `sidebar_state` cookie | cookie | remembers a sidebar open/closed (admin layout component) | Functional |
| `roost_utm` | sessionStorage | keeps campaign tags for attribution | **Analytics / marketing** |
| `roost_visit_<campaign>` | sessionStorage | logs one campaign visit per session to Robin's figures | **Analytics / marketing** |
| PostHog cookie + localStorage | cookie + localStorage | visitor ID, events, session replay | **Analytics** |

## 4. Privacy policy and cookie wording
- **There isn't one.** The site has no privacy policy page, no cookie page and no link to either, so there's nothing to quote. PostHog, session replay and analytics aren't mentioned anywhere visitors can see.
- This is the biggest gap: the passport handles identity, address and income documents, and the site has no privacy notice at all.

## 5. Proposed setup (for approval)
A simple banner shown to every visitor (all RoostNI traffic is UK, so no region check is needed).

- **Accept all** and **Reject all**, same size, side by side, plus **Cookie settings** (one switch: "Analytics, provided by PostHog", off by default). Closing or ignoring the banner counts as no.
- PostHog **doesn't start at all** until Accept. On Reject or no answer, no PostHog cookie, no replay, no autocapture. Campaign tags (`roost_utm`, campaign visit logging) also wait for Accept.
- A permanent **Cookie settings** link in the footer to change your choice later. Withdrawing stops PostHog straight away, clears its cookie and applies in other open tabs.
- The browser's "do not track" privacy signal (Global Privacy Control) counts as Reject.
- The choice and its date are stored on the device, with a wording version, so you can show what each visitor saw.
- Necessary items (sign-in, drafts, reminders) carry on regardless.
- A new **/privacy** page linked from the footer, the banner and sign-up.
- Admin "exclude this device" kept and still works.

Expect PostHog numbers to drop, because only people who accept will be counted. Lovable's cookie-free visitor counts carry on for everyone.

### Itemised credit estimate (build)
| Item | Estimate |
|---|---|
| Consent setup + PostHog only after Accept, cleared on withdrawal | 0.6–0.9 |
| Banner + Cookie settings panel + footer link | 0.4–0.6 |
| Campaign tags gated on consent | 0.1–0.2 |
| /privacy page (your approved wording) + links | 0.3–0.5 |
| **Build total** | **1.4–2.2** |

### Testing (separate)
| Check | Estimate |
|---|---|
| Unit tests: nothing starts before Accept, Reject or GPC blocks, withdrawal stops it | 0.2–0.3 |
| One browser check: no PostHog cookie or requests before Accept, both appear after Accept, gone after Reject | 0.2–0.3 |
| **Testing total** | **0.4–0.6** |

What you'd check yourself: a replay appears in PostHog only after you accept, and the live site after publishing.

### Wording you would need to approve
1. Banner text, e.g. "We use analytics cookies to see how RoostNI is used and to improve it, including recordings of how pages are used. They're off unless you accept." plus the button labels.
2. Cookie settings text: the Necessary row (always on) and the Analytics row.
3. The full privacy policy: who you are (controller, contact address), what is collected (account, passport documents, listings, analytics), why and the lawful basis, who it's shared with (PostHog EU, hosting/database, email), how long it's kept, rights and how to complain to the ICO. I'd draft it for you to edit, but I can't give legal advice. Please have it checked by someone who knows UK data protection rules.
4. Whether session replay stays on at all once there's consent. Turning it off in PostHog is the lower-risk option, given the passport screens.

### Not verified
- PostHog's project settings (replay on or off, input masking) can't be read from the code.
- The cookie names above come from the code and the PostHog defaults, not from a live browser check.
