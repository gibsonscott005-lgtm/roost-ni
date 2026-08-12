# Strengthen the end-of-tenancy workflow

The moving-out journey works technically, but it is thin: everything lives inside one "Ending" tab, neither party sees where they are in the process from their dashboard, destructive actions happen with one click, and the tenancy never moves itself into an "ended" state. This plan makes it a guided, mirrored, hard-to-get-wrong flow for both landlord and tenant.

## 1. One shared stage model

Add a single function that derives the current stage from the tenancy record, notice, inspection and settlement:

```text
Active -> Notice served -> Notice acknowledged -> Move-out inspection
      -> Deposit settlement proposed -> Agreed / Disputed
      -> Deposit returned -> Tenancy completed
```

Each stage carries: a label, whose turn it is (landlord / tenant / nobody), the next action, and any deadline. Both workspaces and both dashboards read from this one source, so the two sides never disagree about what is happening.

## 2. Visible progress tracker in the Ending tab

Replace the stack of independent cards with a step tracker at the top showing all stages, which are done, which is current, and a clear "Your move" or "Waiting on the landlord/tenant" line. The sections below stay, but each is collapsed with a summary once complete, and locked with an explanation when it is not yet that stage's turn (for example, settlement is not editable before the inspection is submitted).

## 3. Missing transitions and guards

- Automatically move the tenancy to "Ended" once the notice end date passes, so the deposit clock and the completion step behave correctly.
- Show a live 28-day deposit countdown, and colour it amber/red as it approaches or passes.
- Block a settlement whose deductions exceed the deposit held, and require a reason on every deduction line.
- Require confirmation for the destructive/irreversible actions: withdraw notice, mark deposit returned, complete tenancy.
- Warn when withdrawing a notice that the other side has already acknowledged.
- Prevent completion while the deposit is unsettled or a dispute is open, with the reason shown rather than a silently disabled button.
- Block serving a notice when the tenancy start date is missing (the statutory period cannot be calculated) and link to where to set it.

## 4. Both sides always know what is going on

- Tenant dashboard and landlord dashboard get an end-of-tenancy status strip on the tenancy card: stage, end date, days remaining, and a button straight into the Ending tab.
- Landlord property cards show "Notice served — ends <date>" instead of plain "Let agreed", and "Available" again after completion.
- Fill the notification gaps in the chain: inspection responded to, settlement proposed, settlement agreed/disputed, deposit returned, deposit deadline approaching, tenancy completed.
- Every stage change writes to the notice/settlement history so the Documents tab shows a full dated audit trail with printable Notice to Quit and deposit statement.

## 5. Tenant-side parity

The tenant currently mostly reads. Add: acknowledge notice with a printable copy, comment on individual inspection items they disagree with, a plain-English "what happens next and by when" panel, and their own end-of-tenancy checklist (meter readings, fuel level, keys, forwarding address).

## Technical notes

- New stage helpers in `src/lib/tenancy-end.ts`; no schema changes needed except a small addition if a forwarding address is stored — otherwise all state already exists on `passport_shares`, `tenancy_notices`, `tenancy_deposit_settlements` and `tenancy_inventory_items`.
- `src/components/tenancy-end-panel.tsx` is split into smaller files (tracker, notice, inspection, settlement, completion) since it is already ~1,400 lines.
- Stage derivation and guards live in shared code so `landlord.manage-tenancy.tsx`, `tenant.tenancy.tsx` and `dashboard.index.tsx` render consistent badges.
- Deposit-deadline and stage notifications reuse the existing `emit_notification` types.
