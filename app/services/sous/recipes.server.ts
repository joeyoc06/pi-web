import {
  createRecipeSchema,
  updateRecipeSchema,
  recipeSearchSchema,
  deleteRecipeSchema,
  type RecipeIngredientInput,
  type CreateRecipeInput,
} from "~/lib/sous/schemas";
import type { RecipeIngredient } from "~/lib/sous/types";
import { db, type AppDbTransaction } from "../db.server";
import { normalizeName, toRecipe, toIngredient } from "./mappers.server";
import { SousError } from "./errors.server";
import { resolveIngredient } from "./ingredients.server";
import { assertNotReferenced, validateReferences } from "./references.server";
import { deleteImageFile } from "./image-upload.server";

export async function searchRecipes(input: unknown = {}) {
  const q = recipeSearchSchema.parse(input);
  const needle = normalizeName(q.q);
  const where = {
    ...(q.course ? { course: q.course } : {}),
    ...(q.difficulty ? { difficulty: q.difficulty } : {}),
    ...(q.slug ? { slug: q.slug } : {}),
    ...(q.cuisine
      ? { cuisine: { contains: normalizeName(q.cuisine) } }
      : {}),
    ...(needle
      ? {
          OR: [
            { title: { contains: needle } },
            { description: { contains: needle } },
          ],
        }
      : {}),
  };
  const needsPostFiltering = !!q.tag || !!q.ingredientId || !!q.cuisine;
  if (!needsPostFiltering) {
    const [rows, total] = await Promise.all([
      db.recipe.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        skip: q.offset,
        take: q.limit,
      }),
      db.recipe.count({ where }),
    ]);
    return { items: rows.map(toRecipe), total };
  }

  // Tags and ingredient references live in JSON columns, so SQLite cannot
  // filter them reliably with Prisma. Cuisine also gets an exact normalized
  // comparison below after its SQL substring prefilter. Apply all post-filters
  // before counting and pagination.
  const candidates = await db.recipe.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
  });
  const matches = candidates
    .map(toRecipe)
    .filter(
      (recipe) =>
        (!q.cuisine ||
          normalizeName(recipe.cuisine ?? "") === normalizeName(q.cuisine)) &&
        (!q.tag ||
          recipe.tags.some(
            (tag) => normalizeName(tag) === normalizeName(q.tag!),
          )) &&
        (!q.ingredientId ||
          recipe.ingredients.some(
            (ingredient) =>
              ingredient.type === "ingredient" &&
              ingredient.ingredientId === q.ingredientId,
          )),
    );
  return {
    items: matches.slice(q.offset, q.offset + q.limit),
    total: matches.length,
  };
}
export async function getRecipe(id: string) {
  const row = await db.recipe.findUnique({ where: { id } });
  if (!row) throw new SousError(404, "NOT_FOUND", "Recipe not found.");
  return toRecipe(row);
}
async function assertSlugAvailable(
  tx: AppDbTransaction,
  slug: string,
  id?: string,
) {
  const existing = await tx.recipe.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (existing && existing.id !== id)
    throw new SousError(
      409,
      "SLUG_CONFLICT",
      "A recipe already uses this slug. Open it or choose a different slug.",
      {
        existingId: existing.id,
        fieldErrors: { slug: ["This slug is already in use."] },
      },
    );
}
async function resolveInputs(
  tx: AppDbTransaction,
  inputs: RecipeIngredientInput[],
): Promise<RecipeIngredient[]> {
  const ingredients: RecipeIngredient[] = [];
  for (const input of inputs) {
    if (input.type !== "new-ingredient") {
      ingredients.push(input);
      continue;
    }
    const { ingredient } = await resolveIngredient(tx, input.ingredient);
    ingredients.push({
      type: "ingredient",
      ingredientId: ingredient.id,
      amount: input.amount,
      unit: input.unit,
      ...(input.preparation !== undefined
        ? { preparation: input.preparation }
        : {}),
      ...(input.isOptional !== undefined
        ? { isOptional: input.isOptional }
        : {}),
    });
  }
  return ingredients;
}
function recipeData(input: CreateRecipeInput, ingredients: RecipeIngredient[]) {
  return {
    title: input.title,
    slug: input.slug,
    description: input.description,
    course: input.course,
    cuisine: input.cuisine ?? null,
    difficulty: input.difficulty,
    prepTimeMinutes: input.prepTimeMinutes,
    cookTimeMinutes: input.cookTimeMinutes,
    totalTimeMinutes:
      input.totalTimeMinutes ?? input.prepTimeMinutes + input.cookTimeMinutes,
    servings: input.servings,
    imageUrl: input.imageUrl ?? null,
    sourceUrl: input.sourceUrl ?? null,
    tags: input.tags,
    instructions: input.instructions,
    ingredients,
  };
}
export function createRecipe(input: unknown) {
  const parsed = createRecipeSchema.parse(input);
  if (
    parsed.totalTimeMinutes === undefined &&
    parsed.prepTimeMinutes + parsed.cookTimeMinutes > 525600
  ) {
    throw new SousError(
      400,
      "VALIDATION_ERROR",
      "The computed total time is too large.",
      {
        fieldErrors: {
          totalTimeMinutes: ["Total time must be at most 525600 minutes."],
        },
      },
    );
  }
  return db.$transaction(
    async (tx) => {
      await assertSlugAvailable(tx, parsed.slug);
      const ingredients = await resolveInputs(tx, parsed.ingredients);
      // Create first to get an ID for cycle validation. The transaction rolls
      // this row and any inline ingredients back if validation fails.
      const row = await tx.recipe.create({
        data: recipeData(parsed, ingredients),
      });
      await validateReferences(tx, row.id, ingredients);
      return toRecipe(row);
    },
    { maxWait: 10000, timeout: 15000 },
  );
}
export function updateRecipe(id: string, input: unknown) {
  const parsed = updateRecipeSchema.parse(input);
  return db.$transaction(
    async (tx) => {
      const previous = await tx.recipe.findUnique({ where: { id } });
      if (!previous) throw new SousError(404, "NOT_FOUND", "Recipe not found.");
      assertFresh(previous.updatedAt, parsed.expectedUpdatedAt);
      await assertSlugAvailable(tx, parsed.slug, id);
      const ingredients = await resolveInputs(tx, parsed.ingredients);
      await validateReferences(tx, id, ingredients);
      const updatedAt = new Date(
        Math.max(Date.now(), previous.updatedAt.getTime() + 1),
      );
      const row = await tx.recipe.update({
        where: { id },
        data: { ...recipeData(parsed, ingredients), updatedAt },
      });
      return toRecipe(row);
    },
    { maxWait: 10000, timeout: 15000 },
  );
}
export function deleteRecipe(id: string, input: unknown = {}) {
  const parsed = deleteRecipeSchema.parse(input);
  return db.$transaction(
    async (tx) => {
      const row = await tx.recipe.findUnique({ where: { id } });
      if (!row) throw new SousError(404, "NOT_FOUND", "Recipe not found.");
      assertFresh(row.updatedAt, parsed.expectedUpdatedAt);
      await assertNotReferenced(tx, "recipe", id);
      await tx.recipe.delete({ where: { id } });
      // Clean up associated image file if it exists
      deleteImageFile(row.imageUrl);
      return { id };
    },
    { maxWait: 10000, timeout: 15000 },
  );
}
function assertFresh(updatedAt: Date, expected?: string) {
  if (expected && updatedAt.toISOString() !== expected)
    throw new SousError(
      409,
      "STALE_RECIPE",
      "This recipe changed since you opened it. Reload before saving so you don't overwrite someone else's changes.",
    );
}

// The UI resolves IDs separately: recipes on the wire keep the user's exact
// RecipeIngredient union, never replacing references with expanded objects.
export async function getCatalog() {
  const [ingredients, recipes] = await db.$transaction([
    db.ingredient.findMany({ orderBy: [{ name: "asc" }, { id: "asc" }] }),
    db.recipe.findMany({
      select: { id: true, title: true },
      orderBy: [{ title: "asc" }, { id: "asc" }],
    }),
  ]);
  return { ingredients: ingredients.map(toIngredient), recipes };
}
