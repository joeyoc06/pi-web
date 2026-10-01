import type { Route } from "./+types/ingredient";
import {
  getIngredient,
  updateIngredient,
  deleteIngredient,
} from "~/services/sous/ingredients.server";
import {
  api,
  ok,
  readJson,
  methodNotAllowed,
} from "~/services/sous/http.server";
export function loader({ params }: Route.LoaderArgs) {
  return api(async () => ok(await getIngredient(params.id)));
}
export function action({ request, params }: Route.ActionArgs) {
  return api(async () => {
    if (request.method === "PUT")
      return ok(await updateIngredient(params.id, await readJson(request)));
    if (request.method === "DELETE")
      return ok(await deleteIngredient(params.id));
    return methodNotAllowed("GET, HEAD, PUT, DELETE");
  });
}
