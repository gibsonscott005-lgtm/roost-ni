# Fair Fuel: add LPG, and make the policy genuinely "same level out"

## Answering the question first

Yes — the intent of Fair Fuel is **like-for-like**: whatever level the tank holds on the day of handover is the level it must be returned at. Full in, full out. Empty in, empty out is acceptable. Anything in between (half in, half out) is treated the same way.

The build does not say that consistently today. The listing form calls it "Empty-In / Full-Out", the printable lease clause says the tank is "supplied full at commencement and returned full", and the tenancy workspaces say "return it to the same level". Three different promises for one policy. This fixes that, and makes the recorded handover level the single source of truth.

## What gets changed

**1. LPG support**
- Heating type gains **LPG** alongside Oil, Gas and Electric on the create-listing form, the listing edit form and the browse filter.
- Fair Fuel applies to any bulk tank, so the policy toggle and the tank gauge appear for **Oil or LPG**, not Oil only.
- Wording adapts to the fuel: "Heating oil tank" vs "LPG tank", sharing the same gauge and level options.
- Existing Oil listings are unaffected.

**2. Consistent "same level out" wording**
- Policy renamed everywhere to **Fair Fuel — same level out**, described as: the tank is returned at the level recorded at handover; if it was empty at handover, empty is acceptable at the end.
- Listing form info box, listing detail page, both tenancy workspaces and the tenant's Fair Fuel tracker all use that one description.
- The lease clause in the printable agreement is rewritten from "supplied full / returned full" to the same-level wording, naming the fuel (heating oil or LPG) and referencing the recorded handover level.
- The Tenancy Information Notice fuel-policy line is updated to match.

**3. Reconciliation at the end of the tenancy**
- The final inspection's fuel field shows the recorded handover level beside the move-out level, and states plainly when the move-out level is lower — "returned below the handover level" — with no verdict attached, in line with Roost assisting rather than deciding.
- Where handover was Empty, an Empty return is shown as meeting the policy.

## Technical notes

- `property_listings.heating_type` is free text, so LPG needs no schema change; the option lists in `dashboard.index.tsx`, `dashboard.listing-edit.tsx` and `listings.index.tsx` are extended, and shared `HEATING_OPTIONS` / `usesFuelTank()` helpers move into `src/lib/listing-details.ts` so all three agree.
- `oil_handover_level` and `final_oil_level` are reused as-is for LPG (they store a level, not a fuel); UI labels derive the fuel name from `heating_type`.
- Fuel copy is centralised in one exported helper (fuel label + policy sentence) used by `dashboard.index.tsx`, `listings.$id.tsx`, `landlord.manage-tenancy.tsx`, `tenant.tenancy.tsx`, `tenancy-end-panel.tsx` and `tenancy-docs.ts`, so the policy is stated in exactly one place.
- `enforce_empty_in_full_out` keeps its column name (no migration) but is only ever surfaced as "Fair Fuel — same level out".
- Level comparison uses the existing level percentages already defined in the tenancy workspaces, lifted into the shared module.