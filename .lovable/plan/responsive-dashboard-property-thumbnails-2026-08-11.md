# Responsive dashboard + property thumbnails

Two problems on the landlord dashboard (and the same pattern elsewhere): on a phone the header and property rows run off the right edge, and property cards show no photo.

## What changes

### 1. Property cards get a photo thumbnail
- The landlord dashboard currently fetches listings without their photos, so nothing can be shown. Add photos to that query.
- Each listing row gains a small cover image on the left (the existing shared photo component, with the "No photos yet" placeholder when a listing has none) — square thumb on mobile, wider on desktop.

### 2. Listing rows render properly on every device
- Restructure each row from a single side-by-side strip into: thumbnail + details, with rent/status underneath on mobile and to the right from tablet up.
- Title, address and heating truncate instead of pushing the row wide; the action buttons ("View applicants" / "Manage Tenancy", "View listing", "Edit") wrap onto their own full-width line on mobile so none are cut off.

### 3. Header fits a 375px screen
- The top bar currently overflows: "Dashboard", the bell and "Sign out" push past the edge.
- Sign out becomes an icon-only button on mobile (full label from `sm:` up), "Dashboard" tightens, and the row is constrained so nothing spills.
- Tab strip ("My properties / Add new property / Applications") keeps horizontal scroll but stops each tab shrinking into two-line wrapped text.

### 4. Same pass over the other views
Apply the same rules to the browse listings grid, listing detail page, applications tab, and the tenancy workspaces: no horizontal overflow at 375px, headings truncate, fixed-size icons/badges don't shrink.

## Technical notes
- `src/routes/_authenticated/dashboard.index.tsx`: add `photo_urls` to the `property_listings` select and its `Listing` type; render `ListingCover` in the row.
- Layout rule used throughout: `grid grid-cols-[minmax(0,1fr)_auto]` on mobile promoted to `flex` at `sm:`, `min-w-0` on every text container, `shrink-0` on icons/thumbs, `truncate` on single-line headings.
- Purely presentational — no schema, query logic (beyond the added column), or business rules change.
- Verified afterwards with a 375px and a 1280px screenshot pass of the landlord and tenant dashboards.
