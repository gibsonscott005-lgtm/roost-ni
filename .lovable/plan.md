## Fix Empty Passport State on Home View (/)

### Problem
The home-page passport card currently shows fictional "James" template data and a 100/100 trust score for new users who have no `tenant_passports` row or whose `*_verified` flags are all false. It should initialise at 0/100 with muted/unverified badges.

### Changes

#### 1. PassportStatusCard logic
- When `passport` is `null` or empty, default all four `*_verified` flags to `false` instead of `true`.
- Compute `verifiedCount` from actual flags; when none are verified the score becomes `0`.
- Show status badge as muted (`bg-surface-muted`) reading **"0/4 checks complete"**.
- Display heading **"Finish your passport"** and sub-copy **"Complete the steps to unlock the Verified badge."**
- Add a prominent primary CTA button **"Build Your Tenant Passport"** linking to `/dashboard/passport/edit` when the score is < 100. Keep the existing secondary "Edit passport" link for users who are already verified.

#### 2. Credential cards (Identity, Income, Reference)
- Default `verified` to `false` when `passport` is `null`.
- Remove hard-coded fallback copy:
  - **IdentityCard** – show "Not yet uploaded" / "Pending".
  - **IncomeCard** – show "Income pending" / "Not yet provided" / "—" instead of £2,840 and "Permanent · Full-time".
  - **ReferenceCard** – show "Reference pending" / "Add a previous landlord to verify" instead of "Margaret Doherty".

#### 3. Page intro & conditional sections
- Make `PageIntro` text conditional: when the passport is empty/unverified, show copy explaining the passport is not yet complete rather than "up to date and ready to share".
- Hide or show an empty-state version of the **PreferenceTracker** and **ShareBar** when the passport is not verified (or keep them hidden until at least one check is complete).
- Update the hard-coded "What James is looking for" `SectionHeading` title to be dynamic (e.g., "Your property preferences") so it never references a fictional name.

### No database changes required.
All work is confined to `src/routes/index.tsx`.