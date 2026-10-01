import type { RecipeIngredient } from "~/lib/sous/types";
import { recipeIngredientSchema } from "~/lib/sous/schemas";
import type { AppDbTransaction } from "../db.server";
import { SousError } from "./errors.server";

export async function referenceGraph(tx: AppDbTransaction) {
  const rows = await tx.recipe.findMany({
    select: { id: true, title: true, ingredients: true },
  });
  return rows.map((row) => {
    const parsed = recipeIngredientSchema.array().safeParse(row.ingredients);
    if (!parsed.success)
      throw new SousError(
        500,
        "INVALID_STORED_RECIPE",
        `Recipe ${row.id} has invalid references.`,
      );
    return { id: row.id, title: row.title, ingredients: parsed.data };
  });
}
export async function validateReferences(
  tx: AppDbTransaction,
  ownerId: string,
  ingredients: RecipeIngredient[],
) {
  const graph = await referenceGraph(tx);
  const ingredientIds = [
    ...new Set(
      ingredients.flatMap((i) =>
        i.type === "ingredient" ? [i.ingredientId] : [],
      ),
    ),
  ];
  const found = new Set(
    (
      await tx.ingredient.findMany({
        where: { id: { in: ingredientIds } },
        select: { id: true },
      })
    ).map((i) => i.id),
  );
  const recipeIds = new Set(graph.map((r) => r.id));
  const missing = ingredients.flatMap((i) => {
    if (i.type === "ingredient")
      return found.has(i.ingredientId) ? [] : [i.ingredientId];
    return i.recipeId === ownerId || recipeIds.has(i.recipeId)
      ? []
      : [i.recipeId];
  });
  if (missing.length)
    throw new SousError(
      400,
      "MISSING_REFERENCE",
      "An ingredient or sub-recipe no longer exists. Choose it again.",
      { ids: [...new Set(missing)] },
    );
  const adjacency = new Map(
    graph.map((r) => [
      r.id,
      r.ingredients.flatMap((i) => (i.type === "recipe" ? [i.recipeId] : [])),
    ]),
  );
  adjacency.set(
    ownerId,
    ingredients.flatMap((i) => (i.type === "recipe" ? [i.recipeId] : [])),
  );
  // Iterative DFS avoids call-stack overflows, detects cycles even in old data.
  const visiting = new Set<string>();
  const done = new Set<string>();
  const stack: { id: string; exit: boolean }[] = [{ id: ownerId, exit: false }];
  while (stack.length) {
    const frame = stack.pop()!;
    if (frame.exit) {
      visiting.delete(frame.id);
      done.add(frame.id);
      continue;
    }
    if (visiting.has(frame.id))
      throw new SousError(
        400,
        "RECIPE_CYCLE",
        "A recipe cannot contain itself, even through another recipe.",
        { ids: [frame.id] },
      );
    if (done.has(frame.id)) continue;
    if (!adjacency.has(frame.id))
      throw new SousError(
        400,
        "MISSING_REFERENCE",
        "A sub-recipe contains a missing recipe reference.",
        { ids: [frame.id] },
      );
    visiting.add(frame.id);
    stack.push({ id: frame.id, exit: true });
    for (const child of adjacency.get(frame.id)!)
      stack.push({ id: child, exit: false });
  }
}
export async function assertNotReferenced(
  tx: AppDbTransaction,
  type: "ingredient" | "recipe",
  id: string,
) {
  const graph = await referenceGraph(tx);
  const blockers = graph
    .filter((r) =>
      r.ingredients.some((i) =>
        i.type === "ingredient"
          ? type === "ingredient" && i.ingredientId === id
          : type === "recipe" && i.recipeId === id,
      ),
    )
    .map(({ id, title }) => ({ id, title }));
  if (blockers.length)
    throw new SousError(
      409,
      "IN_USE",
      `Used in ${blockers.length} recipe${blockers.length === 1 ? "" : "s"}. Remove those references before deleting.`,
      { blockers },
    );
}
