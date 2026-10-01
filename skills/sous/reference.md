# Sous recipe API reference

## Transport

`$PI_WEB_URL` (default `http://localhost:5000`) + `/api/sous`.
Send `Content-Type: application/json` for POST and PUT. No authentication in
this private LAN/VPN deployment. JSON body limit: 1 MB.

| Resource | GET | POST | PUT | DELETE |
|---|---|---|---|---|
| `/recipes` | Search | Atomic create | — | — |
| `/recipes/:id` | Get | — | Replace | Delete |
| `/ingredients` | Search | Create/reuse | — | — |
| `/ingredients/:id` | Get | — | Replace | Delete |

Success: `{ "ok": true, "data": ... }`.
Search data: `{ "items": [...], "total": 42 }`.
Ingredient POST also returns `meta: { created: boolean }`; 201 for creation,
200 when an existing name/category was reused.
Error: `{ "ok": false, "code": "...", "error": "...", "details": {...} }`.
400 validation / missing reference / cycle, 404 missing record, 409 conflict,
413 oversized body, 415 not JSON, 405 unsupported method.
`details.fieldErrors` maps field paths to messages; `existingId`, `blockers`
(list of `{id,title}`), or `ids` may explain conflicts.

## Searches

Recipes: `q` (title/description), `slug` (exact), `course`, `cuisine`,
`difficulty`, `tag` (whole tag), `ingredientId` (direct ingredient reference).
Ingredients: `q` (name), `category`.
Both: `limit` 1–100 (default 24), `offset` ≥0 (default 0). Follow pages while
`offset + items.length < total`. JSON filters apply before pagination.

## Ingredient

```ts
{ id: string; name: string; category: Category }
```
Create/update body: `{ name, category }`. The server allocates IDs.
Categories (required): `grains | protein | vegetable | fruit | dairy | fat |
seasoning | condiment | other`.
Name reuse ignores case and repeated whitespace. It is enforced in the service,
not by a name-unique SQL column. Conflicting categories return 409: reuse the
returned ID or explicitly edit the catalog entry with user permission.

## Recipe

Required on create:

```ts
{
  title: string;
  slug: string; // lowercase letters/digits with single hyphens; unique
  description: string;
  course: "appetizer" | "main" | "side" | "dessert" | "beverage" | "snack";
  difficulty: "easy" | "medium" | "hard";
  prepTimeMinutes: number; // nonnegative integer
  cookTimeMinutes: number; // nonnegative integer
  servings: number; // positive
  tags: string[]; // [] allowed; custom strings and dietary suggestions
  ingredients: RecipeIngredientInput[]; // nonempty, ordered
  instructions: string[]; // nonempty ordered steps; each nonblank
  cuisine?: string; // singular
  imageUrl?: string; // http/https URL only
  sourceUrl?: string; // original recipe page, http/https URL only
  totalTimeMinutes?: number; // omitted on CREATE => prep + cook
}
```

Known dietary suggestions: `vegan`, `vegetarian`, `gluten-free`, `dairy-free`,
`nut-free`, `keto`. Only label when supported; custom tags are fine.

GET/POST/PUT responses add `id`, `createdAt`, `updatedAt` (ISO timestamps) and
always contain totalTimeMinutes. Optional fields are omitted rather than null.
Optional `cuisine`, `imageUrl`, and `sourceUrl` fields are omitted rather than
null. The source URL records the original recipe page; raw imported text,
provenance, and creator columns are not stored.

PUT requires the complete editable recipe, including totalTimeMinutes.
It accepts `expectedUpdatedAt` to reject stale edits (recommended).
Omit cuisine/imageUrl/sourceUrl to clear them. Arrays replace their previous
values.
DELETE accepts optional `{ expectedUpdatedAt }`, or an empty body.

### Ingredient entries

Persisted references are exactly one of:

```ts
{ type: "ingredient", ingredientId: string, amount: number, unit: Unit,
  preparation?: string, isOptional?: boolean }
{ type: "recipe", recipeId: string, amount: number, unit: Unit,
  preparation?: string, isOptional?: boolean }
```

For CREATE/PUT commands ONLY, missing ingredients may use:

```ts
{ type: "new-ingredient", ingredient: { name: string, category: Category },
  amount: number, unit: Unit, preparation?: string, isOptional?: boolean }
```

The service resolves this third variant to an ingredient ID before persisting.
New ingredient creation and the recipe save roll back together on any error.
Sub-recipes must already exist. Self/indirect cycles and missing IDs are rejected.
Deleting any referenced record is blocked; the API lists the blocking recipes.

Units, exactly: `g | kg | oz | lb | ml | l | tsp | tbsp | cup | fl-oz | clove |
pinch | dash | slice | piece | unit`.
Amount: a finite positive number, never null, zero or a string. No free-text unit.
Nested recipe `unit` can mean one serving; converting a cup/gram of a sub-recipe
into servings requires yield information not present in this model.

## Example: atomic recipe save

The existing ingredient ID must come from a real GET/search response.

```json
{
  "title": "Garlic butter shrimp",
  "slug": "garlic-butter-shrimp",
  "description": "Shrimp sautéed in garlic butter.",
  "course": "main",
  "difficulty": "easy",
  "prepTimeMinutes": 10,
  "cookTimeMinutes": 10,
  "servings": 2,
  "tags": ["quick", "weeknight"],
  "ingredients": [
    { "type": "ingredient", "ingredientId": "REPLACE_WITH_ID_FROM_SEARCH",
      "amount": 250, "unit": "g", "preparation": "peeled and deveined" },
    { "type": "new-ingredient", "ingredient": { "name": "Garlic butter", "category": "fat" },
      "amount": 2, "unit": "tbsp" }
  ],
  "instructions": [
    "Melt the garlic butter in a skillet over medium heat.",
    "Add shrimp and sauté until opaque and cooked through."
  ]
}
```
