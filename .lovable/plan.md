## Rebrand to "Roost"

Apply the new app name across all user-facing copy and metadata.

### Files to edit
- `src/routes/__root.tsx` — update default `<title>`, meta description, and any OG tags to use "Roost".
- `src/routes/index.tsx` — update hero/landing copy and headings referencing the old name.
- `src/routes/listings.tsx`, `src/routes/listings.$id.tsx` — page titles/meta to "Roost".
- `src/routes/auth.tsx` — sign-in heading/brand mark.
- `src/components/dashboard-shell.tsx` — sidebar logo/wordmark.
- `index.html` — `<title>` fallback and meta description.
- Any footer / nav components rendering the wordmark.

### Out of scope
- No logo image regeneration (text wordmark only).
- No database, routing, or business-logic changes.
- No favicon swap unless the current one embeds the old name (will check and only replace if so).

### Memory
- Save `mem://index.md` Core rule: "App name is **Roost** (NI rental passport platform). Use British English."
