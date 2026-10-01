import { redirect } from "react-router";
import type { Route } from "./+types/recipe-new";
import { createRecipe, getCatalog } from "~/services/sous/recipes.server";
import {
  pageLoad,
  formError,
  formPayload,
  methodNotAllowed,
} from "~/services/sous/http.server";
import { RecipeForm } from "~/components/food/recipe-form";
export const meta = () => [{ title: "Add a recipe · Sous" }];
export function loader() {
  return pageLoad(async () => ({ catalog: await getCatalog() }));
}
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") return methodNotAllowed("POST");
  try {
    const recipe = await createRecipe(await formPayload(request));
    return redirect(`/food/recipes/${recipe.id}`);
  } catch (error) {
    return formError(error);
  }
}
export default function NewRecipe({ loaderData }: Route.ComponentProps) {
  return <RecipeForm catalog={loaderData.catalog} />;
}
