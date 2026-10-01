# Sous verification

Verified with Node 25.2.1, Prisma/client 6.18.0, the requested node:sqlite
adapter 0.0.1, and agent-browser's Chrome.

## Automated checks

- `pnpm typecheck` — passes across the project.
- Service and HTTP test suites were removed; verification is manual plus
  typecheck.
- Production build — passes; compiled server tested separately from the running
  pi-web instance before release.

Coverage includes the two-table/three-Json schema, typed getters, exact response
shape, ISO dates, array ordering, catalog reuse, category and slug conflicts,
missing references, direct/indirect cycles, concurrent mutations, rollback,
protected deletes, stale edits, JSON filtering before pagination, malformed
JSON, invalid units, wrong content types, unsupported methods and 404s.

## Human workflows exercised with agent-browser

- Food sidebar → Recipes → new editor.
- Empty submission, field errors, correcting fields without losing input.
- Title-to-slug generation; editing a title does not change an existing slug.
- Catalog ingredient search and selection; inline ingredient creation.
- Amount/unit/preparation/optional controls; ingredient and instruction reordering.
- Create, read, edit, and delete a recipe in the browser; verify resulting data
  through the APIs.
- Unsaved-navigation confirmation: Keep editing and Discard changes.
- Search/no-results/clear; catalog create, edit, delete and referenced-delete error.
- Concurrent API edit while a human editor is open: stale save is rejected and
  local form values remain visible.
- Mobile 390×844 layouts; no horizontal document/main overflow.
- Cooking-step checkboxes leave the stored recipe unchanged.
- Production detail page accessibility audit: **zero violations** in the Food
  main content (some color-contrast checks remain manual/incomplete in axe).
- Browser console inspected; no uncaught Sous page errors on completed flows.

## Real Sous import

Used **Import with Sous** in the production build to open a real session with
the configured default model. Sous read the installed `sous` skill,
looked up ingredients, and successfully POSTed a complete recipe with eight
new catalog ingredients:

**Quick & Easy Garlic Noodles**
Source: https://www.budgetbytes.com/garlic-noodles/

Her initial website-extraction attempt needed assistance. A deterministic,
ordinary-HTTP JSON-LD extraction helper was added to the skill and tested. The
source's ½ bunch of green onions was explicitly represented as a catalog entry
“Green onions (bunch)” with amount 0.5/unit, not guessed as individual onions.
No unsupported dietary claims were added. The completed recipe is retained as
an actual starting recipe; transient QA recipes are not kept in the live DB.

## Issues found and fixed

1. **Nested-scroll retention after save** — detail page originally opened part
   way down the previous editor scroll. Food layout resets on pathname changes.
2. **Missing-photo ARIA label** — placeholder now has role=img; axe passes.
3. **Misleading zero-time copy** — 0 minutes now displays 0m in prep/cook/total.
4. **Duplicate document title** — removed the root's fixed title in favor of a
   default meta title so Food route titles work.
5. **Stale-editor version** — draft keeps its original version across loader
   revalidation rather than silently adopting a newer timestamp.
6. **Existing SDK compatibility errors** — updated prompt preflight handling for
   disposition strings; safely narrowed JSON tool arguments/results; aligned
   the Streamdown code plugin with the installed Shiki 4 API.
7. **Existing SSE subscription leak** — closed/aborted browser streams now
   unsubscribe rather than accumulating dead session listeners.

Local evidence (screenshots, API outputs, builds, and audit JSON) is stored in
`.data/sous-qa/`, deliberately not committed because screenshots contain the
private session sidebar. A working report there records the browser checks.
