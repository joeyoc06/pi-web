import type { Route } from "./+types/recipe";
import {
  getRecipe,
  updateRecipe,
  deleteRecipe,
} from "~/services/sous/recipes.server";
import {
  api,
  ok,
  readJson,
  methodNotAllowed,
} from "~/services/sous/http.server";
export function loader({ params }: Route.LoaderArgs) {
  return api(async () => ok(await getRecipe(params.id)));
}
export function action({ request, params }: Route.ActionArgs) {
  return api(async () => {
    if (request.method === "PUT")
      return ok(await updateRecipe(params.id, await readJson(request)));
    if (request.method === "DELETE")
      return ok(await deleteRecipe(params.id, await readJson(request, true)));
    return methodNotAllowed("GET, HEAD, PUT, DELETE");
  });
}
