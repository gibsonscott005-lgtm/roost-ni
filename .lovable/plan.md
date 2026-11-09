# Robin: sign-up-first weekly posts

## What changes
1. **Tips paused, not deleted** — `useful_tip` stays in the code behind a "paused" switch (off). No tip slot in the week, and "Good practice:" is blocked in the post check.
2. **Every post must** name RoostNI, include a one-line description of what it does (listing, Tenant Passport, rent records, deposit and notice reminders, compliance tools), give one concrete benefit, and end with one call to action plus the campaign link. Group posts keep the link in the copyable first comment. The post check rejects any draft missing one of these.
3. **Voice** — loud, blunt, short. The post check blocks "I'd", "Good practice", "creative-writing" filler and closing questions (any post ending in "?" or asking what readers find hardest). The call to action is the last line.
4. **New weekly mix (14, text only):** 5 pain → RoostNI fix, 3 founding offer, 3 move your tenanted home over, 3 what RoostNI does for you (deposit clock, tenancy information notice reminders, landlord registration reminders, rent records, Tenant Passport summary). Spread so the same type never runs twice in a row.
   - Founding wording comes from the central plan wording: first 20 landlords who add a home, tenanted or not; first month free, then £5 first home / £3 each extra, locked 24 months; live places-left count from the address-based home count. "Free forever" stays banned.
   - Tenanted posts link to the public route into "I already have a tenant" (sign-in, then the add-a-home form set to tenanted) and say records take about 10 days to complete, with reminders.
5. **Facts** — legal lines only from approved legal_facts, adding "General information, not legal advice" whenever one is used. Blocked: savings figures, agent-fee comparisons, viewing-slot booking, live rent collection.
6. **Re-draft 10–16 Nov** — unposted drafts in that week are marked skipped with the reason "Replaced by sign-up-first rules" (Robin's history can't be deleted), and 14 new drafts are written on the same schedule: 12:30 group post alternating your two groups, 19:00 RoostNI Page. Posted and already-skipped posts are untouched. I'll paste all 14 into my reply for you to read; nothing is posted (Robin never auto-posts).
7. **Future weeks** — Robin's instructions and the project notes are updated to these rules. The weekly learning summary keeps tracking follows and link visits, grouped by the new post types (older weeks keep their old type names).

## Credit estimate (approximate — I can't see the exact cost of a turn)
| Part | Build |
|---|---|
| 1 Pause tips | 0.1–0.2 |
| 2–3, 5 Post check rules + voice | 0.6–0.9 |
| 4 New mix + founding/tenanted wording | 0.4–0.6 |
| 6 Re-draft the week (one AI run, plus a retry if the check rejects some posts) | 0.4–0.7 |
| 7 Instructions, notes, learning summary types | 0.2–0.3 |
| **Build total** | **1.7–2.7** |
| Testing: unit tests for the mix, required parts, banned phrases, founding wording | 0.3–0.5 |

## Decisions needed from you
- **Public tenanted link:** use the homepage button's link (sign-in, then tenanted add-a-home)? I'll assume yes.
- **"About 10 days"** — this is your figure, not something RoostNI measures. OK to say "about 10 days" as stated?
- **Founding count:** if places left can't be read when drafting, posts say "first 20 landlords" with no number. OK?
- **Call to action wording** — I'll use "Sign up free at…" is banned-adjacent, so I'll use "Add your first home: [link]" / "Claim a founding place: [link]". Tell me if you want different words.

## Will NOT change
legal_facts, deposit return wording, deposit cap wording, posted or skipped posts, the posting schedule or groups, the campaign link tracking, sign-up flow, founder counting, pricing wording file values, cookie consent, anything else on the site. No auto-posting.

## Technical notes
- `src/lib/robin-plan.ts`: new PostType values (`pain_solution`, `founding_offer`, `move_tenanted`, `what_roostni_does`), new 14-slot order, `PAUSED_POST_TYPES = ["useful_tip"]`.
- `src/lib/marketing-knowledge.ts`: required-parts and banned-phrase checks; disclaimer when an approved fact is attached.
- `src/lib/robin-ai/generate.server.ts`: prompt rewritten; founding numbers from `plans-copy.ts`/`pricing.ts`, places from `home-count.ts`.
- Re-draft via the existing re-draft path (skip with reason + insert), scoped to unposted drafts dated 10–16 Nov.
- `robin-weekly-insights.ts`: map new types into comparisons.
