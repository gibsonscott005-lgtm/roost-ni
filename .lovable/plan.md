## Make tenant document uploads visible and verifiable on the dashboard

I checked the database and storage: tenant uploads **are saving correctly** — both `id_document_path` and `income_document_path` are written to `tenant_passports`, files land in the private `tenant-documents` bucket, and the storage RLS policies are correct. The reason it *feels* unreliable is that the dashboard shows a hardcoded "ID & income" label regardless of what's actually stored, and there is no way to open, preview, or confirm the saved files.

This plan adds real visibility so saving is verifiable end-to-end.

### Changes

**1. `src/routes/_authenticated/dashboard.index.tsx` — replace the static "Documents on file" line with a live list**

- Read `id_document_path` and `income_document_path` from the passport (already fetched).
- Render two rows under "Documents on file":
  - **ID document** — shows filename + "Self-Certified" pill + a "View" button.
  - **Income document** — same pattern.
- If a path is missing, show a muted "Not uploaded yet" with a "Add" link to the relevant step in `/dashboard/passport/edit`.
- "View" calls `supabase.storage.from("tenant-documents").createSignedUrl(path, 60)` and opens the URL in a new tab. Errors surface as a toast.
- Move "Documents on file" out of the 3-column grid into its own card so the two file rows have room to breathe.

**2. `src/routes/_authenticated/dashboard.passport.edit.tsx` — confirmation after each upload**

- In `FileDrop`, when `currentPath` is set, add a small "View current file" link that also uses `createSignedUrl`. This lets the tenant verify the saved file from inside the edit flow, not only after returning to the dashboard.
- No changes to the save logic — it already writes the path on success.

**3. No schema or RLS changes**

- `tenant-documents` bucket policies are correct (INSERT/SELECT/DELETE scoped to `auth.uid()` folder). Signed URLs honour those policies.
- No landlord-side document feature is added (per your answer — debug tenant only).

### Out of scope

- Landlord document uploads.
- Replacing the upload mechanism or moving to a server function — current direct-to-storage upload works.

### Technical notes

- Signed URL TTL: 60 seconds is enough to open in a new tab; no caching needed.
- File icons inferred from extension (`.pdf` → `FileText`, image → `Image`).
- All new copy stays in British English and uses the "Self-Certified" wording.
