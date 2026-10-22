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
- Pricing, plan and "free" wording lives only in src/lib/plans-copy.ts; components import it so wording changes in one place.
- Robin's marketing policy and validation live in marketing-knowledge.ts; structured review metadata uses marketing_posts.notes so sources and review flags stay separate from copy-ready posts without a schema change.
- Robin group configuration is persisted server-side; drafts snapshot group settings in notes to keep attribution stable after edits, and schedules use Europe/London rather than a fixed UTC offset.
- New Robin weekly and reply calls use structured Responses output in server-only helpers; legal drafting uses the discovered flagship model with high reasoning, and no posting automation is installed.
