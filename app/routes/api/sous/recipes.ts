import type { Route } from "./+types/recipes";
import { createRecipe, searchRecipes } from "~/services/sous/recipes.server";
import {
  api,
  ok,
  query,
  readJson,
  methodNotAllowed,
} from "~/services/sous/http.server";
export function loader({ request }: Route.LoaderArgs) {
  return api(async () => ok(await searchRecipes(query(request))));
}
export function action({ request }: Route.ActionArgs) {
  return api(async () =>
    request.method === "POST"
      ? ok(await createRecipe(await readJson(request)), 201)
      : methodNotAllowed("GET, HEAD, POST"),
  );
}
