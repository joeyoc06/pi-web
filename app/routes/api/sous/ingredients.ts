import type { Route } from "./+types/ingredients";
import {
  createIngredient,
  searchIngredients,
} from "~/services/sous/ingredients.server";
import {
  api,
  ok,
  query,
  readJson,
  methodNotAllowed,
} from "~/services/sous/http.server";
export function loader({ request }: Route.LoaderArgs) {
  return api(async () => ok(await searchIngredients(query(request))));
}
export function action({ request }: Route.ActionArgs) {
  return api(async () => {
    if (request.method !== "POST") return methodNotAllowed("GET, HEAD, POST");
    const { ingredient, created } = await createIngredient(
      await readJson(request),
    );
    return ok(ingredient, created ? 201 : 200, { created });
  });
}
