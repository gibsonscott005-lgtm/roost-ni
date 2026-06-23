## Fix Tenant Passport data loss + save failures

The passport "disappears" on refresh and edits sometimes don't persist because the data hooks race the Supabase auth session and the wizard uses `.insert()` + `.update()` (which silently no-ops if no row exists for the user yet). Errors are swallowed into a generic toast, hiding RLS / DB error codes.

### 1. Gate every passport fetch on auth session resolution

Update `src/hooks/use-auth.ts` so `loading` stays `true` until both `getSession()` AND the follow-up profile fetch resolve (currently `loading` flips to false before `profile` is set, so consumers can run queries thinking auth is ready).

In `src/routes/_authenticated/dashboard.index.tsx` (`PassportProgress`) and `src/routes/_authenticated/dashboard.passport.edit.tsx` (`PassportEditPage`):
- Pull `loading` (rename locally to `authLoading`) from `useAuth()`.
- Initialise the local `loading` state to `true` and only run the fetch effect when `!authLoading && user`.
- While `authLoading` is true, render the existing `<Loader2 />` spinner block — never fall through to the empty `0/100` / "Loading…" defaults that overwrite real data on refresh.
- Wrap the fetch in `try { … } catch (err) { toast.error("Couldn't load passport", { description: \`\${err.code ?? ""} \${err.message}\` }) }` and keep `loading=true` on error so the UI doesn't blank the existing state.

### 2. Convert all wizard saves to `upsert` with explicit `user_id`

In `src/routes/_authenticated/dashboard.passport.edit.tsx`:

- **`load()` (lines 89-107)** — replace the `select → if no row, insert` pattern with a single `.upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: false }).select("*").single()`. Removes the race where two tabs both insert and the second crashes on the unique constraint.
- **`IdentityStep.onSubmit` (line 577)**, **`IncomeStep.onSubmit` (line 677)**, **`ReferencesStep.onSubmit` (line 878)** — change `.update({...}).eq("user_id", user.id)` to `.upsert({ user_id: user.id, ...payload }, { onConflict: "user_id" }).select("*").single()`. This guarantees the row exists even if the initial `load()` upsert was interrupted, and always re-attaches `user_id` so RLS `WITH CHECK (auth.uid() = user_id)` policies cannot reject the write.
- Confirm `tenant_passports.user_id` has a `UNIQUE` constraint (required for `onConflict`). Check via `supabase--read_query`; if missing, add it in a migration before the code change ships.

### 3. Surface DB errors with code

Replace every `toast.error("Could not save", { description: err.message })` in the three step submit handlers and the new `load()` catch with:

```ts
const code = (err as { code?: string })?.code;
const msg = err instanceof Error ? err.message : "Please try again.";
toast.error("Could not save", { description: code ? `[${code}] ${msg}` : msg });
```

So RLS rejections (`42501`), unique violations (`23505`), etc. are visible in the UI for diagnosis without opening the network panel.

### Out of scope

- No schema/policy changes to `tenant_passports` beyond verifying/adding the `user_id` UNIQUE constraint.
- No changes to upload helper, storage bucket, or any other route.
- No changes to landlord-side flows.

### Technical notes

- `useAuth` change is additive — existing consumers that read only `user`/`profile` continue to work; the new `loading` gate just delays the first fetch by a few ms.
- `upsert` with `onConflict: "user_id"` requires a unique index on `user_id`; the migration is a single `ALTER TABLE … ADD CONSTRAINT tenant_passports_user_id_key UNIQUE (user_id);` if it doesn't already exist.
- Error-code surfacing uses Supabase's standard `PostgrestError.code` shape — no new dependency.