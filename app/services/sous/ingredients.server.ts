import {
  ingredientInputSchema,
  ingredientSearchSchema,
  type IngredientInput,
} from "~/lib/sous/schemas";
import { db, type AppDbTransaction } from "../db.server";
import { normalizeName, toIngredient } from "./mappers.server";
import { SousError } from "./errors.server";
import { assertNotReferenced } from "./references.server";

export async function searchIngredients(input: unknown = {}) {
  const q = ingredientSearchSchema.parse(input);
  const needle = normalizeName(q.q);
  const where = {
    ...(q.category ? { category: q.category } : {}),
    ...(needle ? { name: { contains: needle } } : {}),
  };
  const [items, total] = await Promise.all([
    db.ingredient.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip: q.offset,
      take: q.limit,
    }),
    db.ingredient.count({ where }),
  ]);
  return { items: items.map(toIngredient), total };
}

export async function getIngredient(id: string) {
  const row = await db.ingredient.findUnique({ where: { id } });
  if (!row) throw new SousError(404, "NOT_FOUND", "Ingredient not found.");
  return toIngredient(row);
}

export async function resolveIngredient(
  tx: AppDbTransaction,
  input: IngredientInput,
) {
  const name = input.name.trim().replace(/\s+/g, " ");
  const normalized = normalizeName(name);
  const existing = (await tx.ingredient.findMany()).find(
    (ingredient) => normalizeName(ingredient.name) === normalized,
  );

  if (existing) {
    if (existing.category !== input.category) {
      throw new SousError(
        409,
        "CATEGORY_CONFLICT",
        `“${existing.name}” already exists in ${existing.category}. Reuse its ID or explicitly edit its category.`,
        { existingId: existing.id },
      );
    }
    return { ingredient: toIngredient(existing), created: false };
  }

  const ingredient = await tx.ingredient.create({ data: { ...input, name } });
  return { ingredient: toIngredient(ingredient), created: true };
}

export function createIngredient(input: unknown) {
  const parsed = ingredientInputSchema.parse(input);
  return db.$transaction(
    (tx) => resolveIngredient(tx, parsed),
    { maxWait: 10000, timeout: 15000 },
  );
}

export function updateIngredient(id: string, input: unknown) {
  const parsed = ingredientInputSchema.parse(input);
  return db.$transaction(
    async (tx) => {
      if (!(await tx.ingredient.findUnique({ where: { id } }))) {
        throw new SousError(404, "NOT_FOUND", "Ingredient not found.");
      }

      const conflict = (await tx.ingredient.findMany()).find(
        (ingredient) =>
          ingredient.id !== id &&
          normalizeName(ingredient.name) === normalizeName(parsed.name),
      );
      if (conflict) {
        throw new SousError(
          409,
          "NAME_CONFLICT",
          "Another ingredient already has that name. Reuse it instead.",
          { existingId: conflict.id },
        );
      }

      const ingredient = await tx.ingredient.update({
        where: { id },
        data: { ...parsed, name: parsed.name.replace(/\s+/g, " ") },
      });
      return toIngredient(ingredient);
    },
    { maxWait: 10000, timeout: 15000 },
  );
}

export function deleteIngredient(id: string) {
  return db.$transaction(
    async (tx) => {
      if (!(await tx.ingredient.findUnique({ where: { id } }))) {
        throw new SousError(404, "NOT_FOUND", "Ingredient not found.");
      }
      await assertNotReferenced(tx, "ingredient", id);
      await tx.ingredient.delete({ where: { id } });
      return { id };
    },
    { maxWait: 10000, timeout: 15000 },
  );
}
