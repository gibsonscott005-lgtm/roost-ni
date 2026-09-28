# Roadmap

## PostHog session-recording fixes (this batch)
- [ ] Resolve listing photo URLs server-side (detail + browse) so images render in first paint even in strict in-app browsers
- [ ] Harden photo hook: anonymous visitors skip direct storage calls (they can hang with status 0)
- [ ] Gallery UX: dedicated "Tap to enlarge" button, 44px chevrons, stricter swipe threshold, broken-image fallbacks
- [ ] Listing apply CTA: "Apply for this property" deep-linking to /auth with role/next/listingId + 3-step preview
- [ ] /auth: contextual banner for property applicants (listing title, back link, free-beta trust line)

## Queued (not this batch)
- [ ] Google one-tap sign-in (needs OAuth provider wiring first) — further /auth friction cut
- [ ] Publish homepage revamp + listing alerts + this batch to production
