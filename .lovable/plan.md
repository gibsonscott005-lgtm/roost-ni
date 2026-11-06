# Three small changes — priced separately

Each item is independent. Approve them one at a time by number.

---

## Item 1 — "Try RoostNI free" button wording

**Where it appears:** just one place: the button at the bottom of the Rent receipts guide (/rent-receipts-ni).

**Similar wording also found** (not the same phrase, but it carries the same "free" problem): the /audit results page shows "Get started free — list, let and manage without agent fees" in two places.

**Suggested wording:**
- Rent receipts button: **"Add your property"**
- /audit (both places, optional): **"Add your property — no commission on rent"**

The founding offer details stay on the pricing page. The button itself makes no "free" claim.

**Files:** rent-receipts-ni page; /audit page (optional).
**Estimate:** 0.2–0.4 credits (receipts button only), 0.3–0.5 credits with /audit included.
**What could push it up:** nothing much. These are text-only changes and need no browser walkthrough.

---

## Item 2 — Deposit clock counts from the date the deposit is received

**What happens today:**
- The daily reminder job counts the 28 days from the **tenancy start date**. It also borrows the 28-day *return* deadline setting to do this, which is a coincidence and a bug.
- The deposit countdown ring on Manage Tenancy counts from the **date the lease was signed or sent**.
- No "deposit received" date is stored anywhere, and there is no 35-day reminder for the prescribed information.

**What changes:**
1. Two new optional dates on each tenancy: *deposit received on* and *prescribed information given on*. These are new fields; the existing data is not touched.
2. On the Deposit tab of Manage Tenancy, the landlord enters "Deposit received on" and can mark "Prescribed information given on".
3. The countdown ring and the reminder job both count 28 days (protection) and 35 days (prescribed information) **from the received date only**. With no received date there is no countdown and no overdue alarm. Instead the landlord sees a quiet prompt: "Add the date you received the deposit to start the reminders."
4. Existing tenancies (agreed before RoostNI) keep all alarms switched off, as they are now.
5. Reminder email/notification wording: the 28-day message already says "within 28 days"; I'd add "of receiving it". There is a new 35-day message for the prescribed information. The email design does not change.
6. The 28-day deposit **return** deadline is untouched, but the protection reminder stops using it.

**Files:** the database (one change adding the two date fields), reminders.server.ts, landlord.manage-tenancy.tsx (Deposit tab and countdown), and one small test for the 28-day and 35-day dates.
**Estimate:** 1.5–2.5 credits.
**What could push it up:** a full sign-in walkthrough to check the Deposit tab end to end (+0.5), or tenant-facing deposit screens that turn out to show a countdown too (I'll check them while building).

**Points to decide (I'm not guessing on these):**
- **Pre-filling the received date:** for current tenancies, should it be pre-filled from anything, such as the date the deposit was marked paid? My suggestion is **no**: leave it blank so no false alarms fire.
- **35-day reminder once protected:** should it still fire after the deposit is protected, if the prescribed information hasn't been marked as given? My suggestion is **yes**, because they are separate duties.
- **Deposits received before 1 April 2023:** I'd show no alarms for these, since your audit tied the rules to that date. Please confirm.

---

## Item 3 — Homepage SEO basics (text only)

**What's on the page now:** title "Let & Rent Direct in Northern Ireland — No Commission | RoostNI"; H1 "Renting in Northern Ireland, done direct."; two panel headings, "Need a place?" and "Got a property?". The four tool links are link text, not headings.

**Proposed:**
- **Title:** "Renting Out a Property in Northern Ireland — Landlord Tools | RoostNI"
- **Meta description:** "For Northern Ireland landlords: notice to quit periods, the tenancy information notice, landlord registration and rent receipts — then list and manage your property direct. No commission on rent."
- **H1:** "Renting out a property in Northern Ireland, done direct." (the "No middleman." line below it stays)
- **Panel headings:**
  - "Got a property?" becomes **"How do I rent out my property in Northern Ireland?"**
  - "Need a place?" becomes **"How do I find a place to rent in NI without agent fees?"** (this keeps the tenant side)
- **Tool links, worded as the questions people search** (the text changes, they stay links):
  - "What is a notice to quit in Northern Ireland?"
  - "What is a tenancy information notice?"
  - "Do I need landlord registration in Northern Ireland?" (this replaces the compliance-check link label. The link still goes to /audit unless you'd prefer it to point to /landlord-registration-ni)
  - "Do I have to give a rent receipt for cash?"
- The share (og/twitter) title and description get updated to match.

The longer question headings may wrap onto more lines on phones. That changes how the text flows but not the layout.

**Files:** the homepage only.
**Estimate:** 0.3–0.6 credits.
**What could push it up:** wanting a mobile screenshot check (+0.2–0.3).

---

**Total if all three are approved:** about 2.1–3.6 credits. Bundling them into one pass would save roughly 0.2–0.4.
