import { redirect } from "react-router";
import type { Route } from "./+types/recipe-edit";
import {
  getRecipe,
  updateRecipe,
  getCatalog,
} from "~/services/sous/recipes.server";
import {
  pageLoad,
  formError,
  formPayload,
  methodNotAllowed,
} from "~/services/sous/http.server";
import { RecipeForm } from "~/components/food/recipe-form";
export const meta = () => [{ title: "Edit recipe · Sous" }];
export function loader({ params }: Route.LoaderArgs) {
  return pageLoad(async () => ({
    recipe: await getRecipe(params.recipeId),
    catalog: await getCatalog(),
  }));
}
export async function action({ request, params }: Route.ActionArgs) {
  if (request.method !== "POST") return methodNotAllowed("POST");
  try {
    const recipe = await updateRecipe(
      params.recipeId,
      await formPayload(request),
    );
    return redirect(`/food/recipes/${recipe.id}`);
  } catch (error) {
    return formError(error);
  }
}
export default function EditRecipe({ loaderData }: Route.ComponentProps) {
  return (
    <RecipeForm
      key={loaderData.recipe.id}
      recipe={loaderData.recipe}
      catalog={loaderData.catalog}
    />
  );
}
