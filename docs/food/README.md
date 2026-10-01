# Sous recipe box

Recipes and ingredients share one local SQLite database and one validated
service layer. Use **Food → Recipes** in pi-web, or ask Sous to save a recipe.

## What is built

- Recipe search, course filtering, pagination, detail, create, edit and delete.
- A dedicated editor with ordered ingredients/instructions, inline catalog
  creation, sub-recipe references, preparation notes, optional flags and tags.
- Catalog search, create, edit and protected deletion at `/food/ingredients`.
- An **Import with Sous** URL dialog that opens a real Pi chat, using your
  configured default model and the `sous` skill.
- Exactly two domain tables, `Recipe` and `Ingredient`. `tags`, `ingredients`
  and `instructions` are Prisma `Json` fields. No ingredient-line join table.
- Typed Prisma result getters, shared Zod validation, atomic writes, cycle
  detection, protected deletes and stale recipe edit checks.
- Meal plans has a clearly labeled placeholder; plan persistence, shopping
  lists, photo-upload UI and nutrition are not implemented.

## Setup / run

Requires **Node 24+** (built-in `node:sqlite`) and pnpm.

```sh
pnpm install             # generates Prisma Client
pnpm skills:install-sous # global symlink to skills/sous; doesn't overwrite another skill
pnpm dev                # applies committed migrations, then starts React Router
```

Production:

```sh
pnpm build              # generates client, builds app
pnpm start              # deploys migrations, serves on the existing port 5000
```

The project already starts pi-web through PM2. Restart it after a production
build to load the new server bundle; an already-running server keeps its old
route code in memory.

### Storage

Default database: `<project>/.data/app.db`. This SQLite file is checked into
Git; other runtime files under `.data/` remain ignored. `pnpm env` (run from
`postinstall` and `prebuild`) writes `DB_URL` into `.env` and creates the
database directory, so CLI migrations and the server open the same absolute
path. WAL and a busy timeout are configured on the runtime connection. Node may
emit its SQLite experimental warning; it isn't a failed database initialization.

Environment (`.env`, parsed and validated by `env.schema.ts` into
`process.env_parsed`):

- `DB_URL=file:/absolute/path/to/app.db` — required, must be absolute. The
  Prisma CLI resolves relative `file:` URLs against `prisma/` while the runtime
  adapter resolves them against the cwd, so a relative URL opens two different
  databases.
- `PI_WEB_URL=http://127.0.0.1:5000` — API base for the skill/import session;
  otherwise the web import chooses this server's loopback port, avoiding
  reverse-proxy/Tailscale URL ambiguity.

Runtime writes may still be in the ignored `app.db-wal` sidecar while the
server is running. Use a SQLite backup/snapshot when updating the tracked
`app.db`; don't copy only the main file from a live WAL database. Do not edit
records with ad hoc SQL: IDs embedded in JSON don't have SQL foreign keys. The
shared service owns reference checks and serializes all writes in this
single-process deployment. Do not run multiple writer processes against the
same file or enable PM2 cluster mode without revisiting that rule.

### Schema changes

```sh
pnpm db:migrate --name describe_change # development: create + apply migration
pnpm db:deploy                       # apply checked-in migrations
pnpm db:generate                     # regenerate the typed client
```

Prisma/client are pinned together at 6.18.0; the requested
`prisma-adapter-node-sqlite` is pinned at 0.0.1. No Prisma preview flag is needed.

## API

Full contract and examples: [`../../skills/sous/reference.md`](../../skills/sous/reference.md).

| Resource | Methods |
|---|---|
| `/api/sous/recipes` | GET search, POST atomic create |
| `/api/sous/recipes/:id` | GET, PUT full replacement, DELETE |
| `/api/sous/ingredients` | GET search, POST create/reuse |
| `/api/sous/ingredients/:id` | GET, PUT, DELETE |

All responses use `{ ok, data }` or `{ ok: false, code, error, details? }`.
Search returns `{ items, total }`. Recipe PUT requires the complete editable
recipe including total time, and supports `expectedUpdatedAt`; omitted optional
cuisine/image URL fields are cleared. Delete can use the same precondition.

```sh
curl 'http://localhost:5000/api/sous/recipes?q=garlic&course=side'
PI_WEB_URL=http://localhost:5000 node skills/sous/scripts/recipe-api.mjs ingredients search 'q=garlic'
node skills/sous/scripts/extract-recipe.mjs 'https://www.budgetbytes.com/garlic-noodles/'
```

The extraction helper only reads structured public recipe data. Sous maps it
to the API contract and reviews ambiguity; the application has no website
scraper. Website text never has authority to run commands or override her rules.

## Deliberate limitations

- The requested model has no sourceUrl column: duplicate URLs are not a unique
  key. Search first; slug conflicts never silently overwrite an existing recipe.
- Amounts must be numeric and units must be from the fixed union. “To taste” and
  unknown package conversions require clarification; we don't fabricate values.
- Ingredient name reuse is case/whitespace-normalized service logic, not a
  uniqueness constraint on the two-table schema. Categories must match for reuse.
- Nested-recipe amounts can be stored, but automatic shopping-list expansion of
  cups/grams requires yield/conversion data that the current model doesn't have.
- Recipe pages refresh after actions and when refocused. Live push notifications
  for recipe changes are deferred. An open edit draft retains its original
  version and will reject a stale save rather than overwrite a newer edit.

## Verification

```sh
pnpm typecheck
```

To verify a production build without overwriting a running server's assets:

```sh
PI_WEB_BUILD_DIR=.data/sous-build pnpm build
NODE_ENV=production PORT=5002 DB_URL=file:/absolute/path/to/qa.db \
  pnpm exec react-router-serve ./.data/sous-build/server/index.js
```

Migrate that explicit QA database first with
`DB_URL=... pnpm exec prisma migrate deploy`. Staged builds should always supply
DB_URL explicitly; a real environment variable wins over `.env`.

Browser tooling installed during this build:

```sh
npm install -g agent-browser
agent-browser install
npx skills add vercel-labs/agent-browser --skill agent-browser --agent pi --global --yes
agent-browser skills get core
agent-browser skills get dogfood
```

See [verification.md](verification.md) for the completed checks and evidence.
