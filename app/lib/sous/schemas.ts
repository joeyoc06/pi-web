import { z } from "zod";
import type { Ingredient, Recipe, RecipeIngredient } from "./types";

export const UNITS = [
  "g",
  "kg",
  "oz",
  "lb",
  "ml",
  "l",
  "tsp",
  "tbsp",
  "cup",
  "fl-oz",
  "clove",
  "pinch",
  "dash",
  "slice",
  "piece",
  "unit",
] as const;
export const COURSES = [
  "appetizer",
  "main",
  "side",
  "dessert",
  "beverage",
  "snack",
] as const;
export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export const DIETARY_TAGS = [
  "vegan",
  "vegetarian",
  "gluten-free",
  "dairy-free",
  "nut-free",
  "keto",
] as const;
export const CATEGORIES = [
  "grains",
  "protein",
  "vegetable",
  "fruit",
  "dairy",
  "fat",
  "seasoning",
  "condiment",
  "other",
] as const;

const id = z.string().trim().min(1, "Choose an ingredient or recipe.").max(200);
const name = z.string().trim().min(1, "A name is required.").max(200);
const minutes = z.number().int().min(0).max(525600);
const amountFields = {
  amount: z.number().positive("Amount must be greater than zero.").max(1e9),
  unit: z.enum(UNITS),
  preparation: z.string().trim().max(1000).optional(),
  isOptional: z.boolean().optional(),
};
const ingredientRef = z.strictObject({
  type: z.literal("ingredient"),
  ingredientId: id,
  ...amountFields,
});
const recipeRef = z.strictObject({
  type: z.literal("recipe"),
  recipeId: id,
  ...amountFields,
});
export const recipeIngredientSchema = z.discriminatedUnion("type", [
  ingredientRef,
  recipeRef,
]);
export const ingredientInputSchema = z.strictObject({
  name,
  category: z.enum(CATEGORIES),
});
export const ingredientSchema = ingredientInputSchema.extend({
  id,
}) satisfies z.ZodType<Ingredient>;
export const recipeIngredientInputSchema = z.discriminatedUnion("type", [
  ingredientRef,
  recipeRef,
  z.strictObject({
    type: z.literal("new-ingredient"),
    ingredient: ingredientInputSchema,
    ...amountFields,
  }),
]);
export const httpUrlSchema = z
  .url()
  .max(2048)
  .refine(
    (value) => ["http:", "https:"].includes(new URL(value).protocol),
    "Use an http or https URL.",
  );
export const imageUrlSchema = httpUrlSchema;
const recipeFields = {
  title: name,
  slug: z
    .string()
    .trim()
    .min(1, "A slug is required.")
    .max(200)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers and single hyphens.",
    ),
  description: z.string().trim().min(1, "Describe the recipe.").max(10000),
  course: z.enum(COURSES),
  cuisine: z.string().trim().min(1).max(100).optional(),
  difficulty: z.enum(DIFFICULTIES),
  prepTimeMinutes: minutes,
  cookTimeMinutes: minutes,
  totalTimeMinutes: minutes,
  servings: z
    .number()
    .positive("Servings must be greater than zero.")
    .max(100000),
  tags: z.array(z.string().trim().min(1).max(100)).max(50),
  imageUrl: imageUrlSchema.optional(),
  sourceUrl: httpUrlSchema.optional(),
  ingredients: z
    .array(recipeIngredientSchema)
    .min(1, "Add at least one ingredient.")
    .max(200),
  instructions: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Write an instruction or remove this step.")
        .max(10000),
    )
    .min(1, "Add at least one instruction.")
    .max(200),
};
export const recipeSchema = z.strictObject({
  id,
  ...recipeFields,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}) satisfies z.ZodType<Recipe>;
export const createRecipeSchema = z.strictObject({
  ...recipeFields,
  totalTimeMinutes: minutes.optional(),
  ingredients: z
    .array(recipeIngredientInputSchema)
    .min(1, "Add at least one ingredient.")
    .max(200),
});
// PUT is a complete replacement, not a patch. Explicit total preserves resting time.
export const updateRecipeSchema = createRecipeSchema.extend({
  totalTimeMinutes: minutes,
  expectedUpdatedAt: z.iso.datetime().optional(),
});
export const deleteRecipeSchema = z.strictObject({
  expectedUpdatedAt: z.iso.datetime().optional(),
});

const pagination = {
  limit: z.coerce.number().int().min(1).max(100).default(24),
  offset: z.coerce.number().int().min(0).max(1e7).default(0),
};
export const ingredientSearchSchema = z.object({
  ...pagination,
  q: z.string().trim().max(200).default(""),
  category: z.enum(CATEGORIES).optional(),
});
export const recipeSearchSchema = z.object({
  ...pagination,
  q: z.string().trim().max(200).default(""),
  course: z.enum(COURSES).optional(),
  cuisine: z.string().trim().max(100).optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  tag: z.string().trim().max(100).optional(),
  ingredientId: id.optional(),
  slug: z.string().trim().max(200).optional(),
});

export type IngredientInput = z.infer<typeof ingredientInputSchema>;
export type RecipeIngredientInput = z.infer<typeof recipeIngredientInputSchema>;
export type CreateRecipeInput = z.input<typeof createRecipeSchema>;
export type UpdateRecipeInput = z.input<typeof updateRecipeSchema>;
export type RecipeSearch = z.infer<typeof recipeSearchSchema>;
export type IngredientSearch = z.infer<typeof ingredientSearchSchema>;
// Compile-time check that our persisted discriminator matches the public type.
export const persistedIngredientSchema: z.ZodType<RecipeIngredient> =
  recipeIngredientSchema;
