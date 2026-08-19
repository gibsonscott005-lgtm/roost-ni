---
name: Palette and elevation rules
description: Warm Porcelain palette, emerald reserved for verification only, and the shadow-resting/raised/floating/verified elevation tokens
type: design
---

## Emerald is reserved (constraint)

`--verified` emerald (`oklch(0.62 0.145 163)`, ~#059669) means **self-certified /
verified / success / active progress** only. It must NOT become the general brand
action colour.

**Why:** landlords scan applicant cards and read green as a trust signal. Making
every submit button emerald destroys that signal.

**How to apply:** primary buttons stay near-black (`--primary`). Emerald is for
verified badges, success states, active tab/step indicators and progress bars.
Rejected explicitly (Aug 2026) after a suggestion to use emerald for all main
submit buttons and active toggles.

## Warm Porcelain neutrals

Ground is a warm neutral (hue ~95), not cool blue-slate. Never move the
background toward Tailwind slate tones (`#F8FAFC` etc.) — that reintroduces the
cold, grey feel the user disliked.

- `--background` sits meaningfully below `--surface` so cards visibly lift.
- Borders and muted surfaces share the same warm hue.

## Elevation tokens

Never hand-write `shadow-[0_...rgba(15,23,42,...)]`. Use the tokens:

- `shadow-resting` — form fields, small chips
- `shadow-raised` — cards, popovers, sticky bars
- `shadow-floating` — primary page panels, modals
- `shadow-verified` — emerald-tinted glow on verified surfaces

Defined in `src/styles.css` with `color-mix()` against `--foreground` so they
follow the theme.

## Form fields

Inputs, selects and textareas use `bg-surface` (white) + `shadow-resting`, never
`bg-surface-muted`. Flat grey fields were the main cause of the app feeling grey.
