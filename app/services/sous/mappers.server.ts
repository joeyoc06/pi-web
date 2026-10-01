import type {
  Recipe as Row,
  Ingredient as IngredientRow,
} from "@prisma/client";
import { ingredientSchema, recipeSchema } from "~/lib/sous/schemas";
import type { Recipe, Ingredient } from "~/lib/sous/types";
import { SousError } from "./errors.server";

export function toRecipe(row: Row): Recipe {
  const parsed = recipeSchema.safeParse({
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    course: row.course,
    difficulty: row.difficulty,
    ...(row.cuisine !== null ? { cuisine: row.cuisine } : {}),
    ...(row.imageUrl !== null ? { imageUrl: row.imageUrl } : {}),
    ...(row.sourceUrl !== null ? { sourceUrl: row.sourceUrl } : {}),
    prepTimeMinutes: row.prepTimeMinutes,
    cookTimeMinutes: row.cookTimeMinutes,
    totalTimeMinutes: row.totalTimeMinutes,
    servings: row.servings,
    tags: row.tags,
    ingredients: row.ingredients,
    instructions: row.instructions,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
  if (!parsed.success)
    throw new SousError(
      500,
      "INVALID_STORED_RECIPE",
      `Recipe ${row.id} contains invalid stored data. Repair it before continuing.`,
    );
  return parsed.data;
}
export function toIngredient(row: IngredientRow): Ingredient {
  const parsed = ingredientSchema.safeParse(row);
  if (!parsed.success)
    throw new SousError(
      500,
      "INVALID_STORED_INGREDIENT",
      `Ingredient ${row.id} contains invalid stored data.`,
    );
  return parsed.data;
}
export function normalizeName(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en-US");
}
