# Warming up the Roost interface

Your instinct is right — the app reads flat and cold. My assessment differs from Gemini's on one point and refines the other two.

## Where I agree with Gemini

**Depth is the real problem, not hue.** This is the biggest win and I'd do it first.

**A warmer, better-separated background.** Worth doing, but not with the hex codes suggested.

## Where I disagree

**Emerald should not become the primary action colour.** In Roost, emerald currently *means* "self-certified / verified / good standing". If every submit button turns emerald, a landlord scanning applicant cards can no longer read green as a trust signal. Black stays the primary action; emerald stays reserved. Confirmed with you.

Also, one of Gemini's suggested backgrounds (`#F8FAFC`) is Tailwind's slate-50 — *cooler* than the current background, so it would make the greyness slightly worse rather than better.

## What I'd actually change

### 1. Introduce real elevation tokens

The design system has no shadow tokens at all. Instead there are 14 different hand-written shadow values scattered across components, all using hardcoded slate `rgba()` — which bypasses theming and will break in dark mode.

Add three elevation tokens (resting, raised, floating) plus one emerald-tinted glow for verified surfaces, then replace the ad-hoc values with them. Consistent depth everywhere, themable, and far fewer one-off strings.

### 2. Widen the background-to-surface gap

Cards are pure white on a background only marginally darker, so nothing appears to lift off the page. Deepen the background slightly and shift its hue from cool blue-slate toward a warm neutral porcelain. Cards stay near-white, so the separation becomes visible without the page getting dark.

### 3. Give form inputs presence

Inputs are currently flat bordered rectangles — the single biggest contributor to the "grey form" feeling, and the passport wizard is mostly inputs. Give them the surface colour, the resting elevation, a slightly softer border, and a clear emerald focus ring.

### 4. Deepen the emerald

The current emerald is light enough that it washes out against white, so the verified badges read weaker than they should. Deepen it toward `#059669` and darken the soft tint that pairs with it. Emerald stays scoped to verification, success, active tab states and progress.

### 5. Warm the borders

Borders are cool blue-grey. Retuning them to match the new neutral removes the last of the cold cast.

## What stays exactly as-is

- Layout, spacing, typography, component structure
- Black as the primary button colour
- Every route's content and behaviour
- All business logic

## Technical detail

- All work lands in `src/styles.css` token definitions, plus a mechanical find-and-replace of hardcoded `shadow-[...]` values in components.
- New tokens registered in `@theme inline` as `--shadow-*` so they generate `shadow-resting`, `shadow-raised`, `shadow-floating`, `shadow-verified`.
- Shadows defined with `color-mix()` against `--foreground` rather than literal `rgba(15,23,42,…)`, so they follow the theme.
- Tokens touched: `--background`, `--surface`, `--surface-muted`, `--border`, `--input`, `--verified`, `--verified-soft`, `--ring`.
- Dark-mode values updated in the same pass so the two themes stay in step.
- Verify at 375px and desktop, checking the passport wizard, listings browse, landlord dashboard and applications inbox.
