import { useCallback, useMemo, useState } from "react";
import { Form, Link, data } from "react-router";
import { ArrowLeftIcon, PlusIcon, SearchIcon, CarrotIcon } from "lucide-react";
import type { Route } from "./+types/ingredients";
import type { Ingredient } from "~/lib/sous/types";
import {
  searchIngredients,
  createIngredient,
  updateIngredient,
  deleteIngredient,
} from "~/services/sous/ingredients.server";
import {
  query,
  pageLoad,
  formError,
  methodNotAllowed,
} from "~/services/sous/http.server";
import { ingredientSearchSchema, CATEGORIES } from "~/lib/sous/schemas";
import { SousError } from "~/services/sous/errors.server";
import { label } from "~/lib/sous/display";
import { useRefreshOnFocus } from "~/components/food/food-shell";
import { IngredientEditor } from "~/components/food/ingredient-editor";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from "~/components/ui/input-group";
import {
  NativeSelect,
  NativeSelectOption,
} from "~/components/ui/native-select";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "~/components/ui/empty";
export const meta = () => [{ title: "Ingredients · Sous" }];
export function loader({ request }: Route.LoaderArgs) {
  return pageLoad(async () => {
    const filters = ingredientSearchSchema.parse(query(request));
    return { ...(await searchIngredients(filters)), filters };
  });
}
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") return methodNotAllowed("POST");
  try {
    const form = await request.formData();
    const id = String(form.get("id") || "");
    const value = { name: form.get("name"), category: form.get("category") };
    if (form.get("intent") === "create") await createIngredient(value);
    else if (form.get("intent") === "update") await updateIngredient(id, value);
    else if (form.get("intent") === "delete") await deleteIngredient(id);
    else
      throw new SousError(400, "INVALID_INTENT", "Unknown ingredient action.");
    return data({ ok: true as const });
  } catch (error) {
    return formError(error);
  }
}
export default function Ingredients({ loaderData }: Route.ComponentProps) {
  const { items, total, filters } = loaderData;
  const [editor, setEditor] = useState<{ ingredient?: Ingredient } | null>(
    null,
  );
  useRefreshOnFocus();
  const add = useCallback(() => setEditor({}), []);
  const close = useCallback(() => setEditor(null), []);
  const edit = useCallback(
    (ingredient: Ingredient) => setEditor({ ingredient }),
    [],
  );
  const options = useMemo(
    () =>
      CATEGORIES.map((c) => (
        <NativeSelectOption key={c} value={c}>
          {label(c)}
        </NativeSelectOption>
      )),
    [],
  );
  const rows = useMemo(
    () =>
      items.map((i) => (
        <IngredientRow key={i.id} ingredient={i} onEdit={edit} />
      )),
    [items, edit],
  );
  const next = useMemo(
    () =>
      `/food/ingredients?${new URLSearchParams({ q: filters.q, category: filters.category || "", offset: String(filters.offset + filters.limit) })}`,
    [filters],
  );
  const previous = useMemo(
    () =>
      `/food/ingredients?${new URLSearchParams({ q: filters.q, category: filters.category || "", offset: String(Math.max(0, filters.offset - filters.limit)) })}`,
    [filters],
  );
  return (
    <div className="flex flex-col gap-8">
      <header>
        <Link
          className="mb-5 flex items-center gap-2 text-xs text-muted-foreground"
          to="/food/recipes"
        >
          <ArrowLeftIcon className="size-3" />
          All recipes
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Ingredients
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Your shared catalog. One garlic, many good dinners.
            </p>
          </div>
          <Button onClick={add}>
            <PlusIcon data-icon="inline-start" />
            New ingredient
          </Button>
        </div>
      </header>
      <Form
        method="get"
        key={`${filters.q}-${filters.category}`}
        className="flex flex-wrap gap-3"
        role="search"
      >
        <InputGroup className="min-w-48 flex-1">
          <InputGroupInput
            aria-label="Search ingredients"
            name="q"
            defaultValue={filters.q}
            placeholder="Find an ingredient…"
          />
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
        </InputGroup>
        <NativeSelect
          name="category"
          aria-label="Filter by category"
          defaultValue={filters.category || ""}
        >
          <NativeSelectOption value="">All categories</NativeSelectOption>
          {options}
        </NativeSelect>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </Form>
      <p className="text-xs text-muted-foreground" role="status">
        {total} catalog entries
      </p>
      {items.length ? (
        <div className="divide-y border">{rows}</div>
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CarrotIcon />
            </EmptyMedia>
            <EmptyTitle>No ingredients found</EmptyTitle>
            <EmptyDescription>
              Add one here, or create ingredients as you write a recipe.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      {total > filters.limit && (
        <nav aria-label="Ingredient pages" className="flex justify-between">
          <Button
            variant="outline"
            render={<Link to={previous} />}
            nativeButton={false}
            disabled={filters.offset === 0}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            render={<Link to={next} />}
            nativeButton={false}
            disabled={filters.offset + filters.limit >= total}
          >
            Next
          </Button>
        </nav>
      )}
      {editor && (
        <IngredientEditor
          key={editor.ingredient?.id || "new"}
          ingredient={editor.ingredient}
          open
          onClose={close}
        />
      )}
    </div>
  );
}
function IngredientRow({
  ingredient,
  onEdit,
}: {
  ingredient: Ingredient;
  onEdit: (i: Ingredient) => void;
}) {
  const handleEdit = useCallback(
    () => onEdit(ingredient),
    [onEdit, ingredient],
  );
  const category = useMemo(
    () => label(ingredient.category),
    [ingredient.category],
  );
  const editLabel = useMemo(() => `Edit ${ingredient.name}`, [ingredient.name]);
  return (
    <div className="flex items-center gap-3 p-4">
      <p className="flex-1 text-sm font-medium">{ingredient.name}</p>
      <Badge variant="secondary">{category}</Badge>
      <Button variant="ghost" onClick={handleEdit} aria-label={editLabel}>
        Edit
      </Button>
    </div>
  );
}
