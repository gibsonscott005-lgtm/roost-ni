## Fix PDF uploads failing with "Failed to fetch" on mobile Safari

PNGs upload fine; PDFs from the Files app fail with a browser-level `Failed to fetch` (no status, no server response) on identity, income and the optional reference upload. The previous attempt to buffer the `File` into a `Blob` before calling Supabase Storage didn't fix it — `supabase-js` still wraps the body in `FormData` with the original `File`/`Blob` reference, which Safari intermittently aborts mid-stream for PDF MIME bodies from cross-origin iframes.

### Approach

Replace the shared `uploadDoc` helper in `src/routes/_authenticated/dashboard.passport.edit.tsx` with one that:

1. Reads the picked file into an `ArrayBuffer` immediately (snapshot bytes — avoids Safari's "file reference went stale" abort that happens with iCloud-backed PDFs).
2. Wraps it in a fresh `Blob` with an explicit, extension-based content type (`application/pdf`, `image/jpeg`, `image/png`, `image/webp`, `image/heic`, falling back to the browser-reported type, then `application/octet-stream`).
3. Validates size up front (reject > 10 MB with a friendly toast — matches the dropzone copy and prevents a silent network failure on slow mobile uploads).
4. Calls `supabase.storage.upload(path, blob, { contentType, cacheControl: "3600", upsert: false })`.
5. Retries the upload once on a network-level `Failed to fetch` / `TypeError` (not on Supabase API errors) before surfacing the error. Mobile Safari often succeeds on the immediate retry after the first PDF stall.

Because all three steps (Identity, Income, References optional letter) already go through `uploadDoc`, this single helper change fixes every upload site in the wizard. No DB schema, RLS, bucket, or component-shape changes are needed — the storage bucket and policies are already correct (PNG upload from the same user/session succeeded).

### Error surfacing

Update the `toast.error("Could not save", …)` calls in `IdentityStep`, `IncomeStep` and `ReferencesStep` to show a clearer description when the failure originates in storage vs. the DB write, so a future stall is diagnosable from the UI without checking the network panel ("Upload didn't complete — please try again on a stable connection").

### Out of scope

- No new bucket, no policy edits, no edge function.
- No image compression / PDF re-encoding — file size is fine, the issue is the request stream, not the payload.
- Landlord-side uploads aren't in scope (debug remit is tenant uploads).

### Technical notes

- `file.arrayBuffer()` is supported on iOS Safari 14+; we already require modern browsers elsewhere in the wizard.
- The retry uses a fresh `Blob` built from the same buffered bytes so the second attempt doesn't reuse a consumed stream.
- Content-type map is keyed on the lower-cased extension; unknown types fall back to `file.type || "application/octet-stream"`.
