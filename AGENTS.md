<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep first-paint font selection stable with preloaded optional web fonts; slow font downloads must not reflow pages.
- Reserve photo and gallery-thumbnail space before URLs resolve, and stack alternate homepage audience panels in one grid cell so switching audiences does not move subsequent content.
- Resolve browser Cloud settings through the build-time public allowlist, preferring VITE settings and accepting only URL/publishable-key server fallbacks; omit absent defines so managed preview configuration can inject them later without exposing private credentials.
- Resolve the Vite project root from the working directory, not import.meta.url, because configuration bundling relocates the config into a temporary folder.
- Never alias or globally pin the bare entities package; only legacy email-renderer subpaths may be aliased, so modern HTML parsers resolve their own compatible decoder exports.
- Pricing, plan and "free" wording lives only in src/lib/plans-copy.ts; components import it so wording changes in one place.
- Robin's marketing policy and validation live in marketing-knowledge.ts; structured review metadata uses marketing_posts.notes so sources and review flags stay separate from copy-ready posts without a schema change.
- Robin group configuration is persisted server-side; drafts snapshot group settings in notes to keep attribution stable after edits, and schedules use Europe/London rather than a fixed UTC offset.
- New Robin weekly and reply calls use structured Responses output in server-only helpers; legal drafting uses the discovered flagship model with high reasoning, and no posting automation is installed.
- Robin legal claims come exclusively from legal_facts; source snapshots live in legal_sources, human approval dates never refresh automatically, and secure TanStack callbacks perform weekly checks via pg_cron because this stack does not use Edge Functions.
- Legal source URL validation lives in dependency-free src/lib/legal-source-url.ts; server function handlers must never import the cheerio-based legal-source-reader.server (its undici chain breaks the published worker bundle with "markAsUncloneable" errors).
- Keep vite.config.ts optimizeDeps.include listing every client library the app loads (router core/SSR helpers, seroval, h3-v2, etc.); late discovery makes Vite pause and force-reload the preview after wake-ups. Add new client packages there when installing them.
- Landlord funnel steps are written only through the log_landlord_funnel_event database function (first time kept, latest time bumped) and the table stores user ids only; emails are joined at read time for admins so personal details never live in tracking data.
