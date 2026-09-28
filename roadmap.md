# Roadmap

## PostHog session-recording fixes — DONE (in preview, verified end-to-end)
- [x] Listing photo URLs resolved server-side (detail + browse) — images render in first paint even in strict in-app browsers
- [x] Photo hook hardened: anonymous visitors skip direct storage calls (they could hang with status 0)
- [x] Gallery UX: dedicated "Tap to enlarge" button, 44px chevrons, stricter swipe threshold, broken-image fallbacks
- [x] Listing apply CTA: "Apply for this property" deep-links to /auth with role/next/listingId + 3-step preview
- [x] /auth: contextual banner for property applicants (listing title, back link, free-beta trust line)

## Queued (not this batch)
- [ ] Google one-tap sign-in (needs OAuth provider wiring first) — further /auth friction cut
- [ ] Publish homepage revamp + listing alerts + this batch to production
